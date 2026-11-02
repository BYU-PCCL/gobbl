import SwiftUI

/// `/chat/[id]`: the live chat, the read-only transcript of a finished debate, or the results
/// right after finishing. The tab bar is hidden so the input sits at the bottom edge.
struct DebateView: View {
    let debateId: String

    @Environment(\.appEnvironment) private var env
    @Environment(ConfigStore.self) private var configStore
    @State private var model: ChatViewModel?

    var body: some View {
        Group {
            if let model {
                DebateContent(model: model)
            } else {
                Color.gBg
            }
        }
        .background(Color.gBg.ignoresSafeArea())
        .toolbar(.hidden, for: .tabBar)
        .task {
            guard model == nil, let env else { return }
            let tracker = env.levelTracker
            let profile = env.profile
            let userId = env.auth.currentUser?.id
            let vm = ChatViewModel(debateId: debateId, client: env.client,
                                   rules: configStore.config?.rules) { result in
                // Results celebrate the level-up, so record it: the dashboard must not repeat it.
                if let userId { tracker.observe(level: result.newLevel, for: userId) }
                Task { await profile.refresh() }
            }
            model = vm
            await vm.load()
        }
    }
}

private struct DebateContent: View {
    @Bindable var model: ChatViewModel

    @Environment(AuthStore.self) private var auth
    @Environment(AIConsentStore.self) private var consent
    @Environment(ConfigStore.self) private var configStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @FocusState private var inputFocused: Bool
    @State private var pendingConsent: (() -> Void)?

    var body: some View {
        switch model.phase {
        case .loading:
            VStack(spacing: GSpace.md) {
                AvatarView(stage: 1, size: 88, animate: true)
                Text("Preparing your discussion…").gText(.bodySM).foregroundStyle(Color.gInkSoft)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .gInlineTitle()
        case .loadFailed(let message):
            VStack(spacing: GSpace.lg) {
                AvatarView(stage: 1, size: 88)
                Text(message).gText(.bodySM).foregroundStyle(Color.gInkSoft).multilineTextAlignment(.center)
                HStack(spacing: GSpace.sm) {
                    GButton("Try again", size: .sm, icon: .refresh) { Task { await model.load() } }
                    GButton("Go back", variant: .ghost, size: .sm) { dismiss() }
                }
            }
            .padding(GSpace.xxl)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .gInlineTitle()
        case .finished(let result):
            ResultsView(result: result)
                .navigationBarTitleDisplayMode(.inline)
                .navigationTitle("Results")
        case .active, .finishing, .finishFailed, .transcript:
            conversation
        }
    }

    // MARK: - Conversation

    private var isTranscript: Bool { model.phase == .transcript }

    private var conversation: some View {
        VStack(spacing: 0) {
            header
            if isTranscript {
                Text("View-only transcript. This discussion is finished.")
                    .gText(.bodyXS).foregroundStyle(Color.gInkSoft)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, GSpace.sm)
                    .background(Color.gSurface2)
            } else {
                roundBar
            }
            messages
            if !isTranscript { inputArea }
        }
        .overlay { finishOverlay }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) { partnerTitle }
        }
        .aiConsentGate(pending: $pendingConsent, userId: auth.currentUser?.id)
    }

    private var partnerTitle: some View {
        VStack(spacing: 1) {
            Text(model.summary?.personaInitials ?? "Robert").gText(.bodySM).fontWeight(.bold)
            HStack(spacing: 4) {
                Text(ideologyLabel)
                Text("·")
                Text(model.summary?.difficulty.displayName ?? "")
            }
            .font(GFont.font(.mono, size: 10, weight: 500, relativeTo: .caption2))
            .textCase(.uppercase)
            .foregroundStyle(Color.gInkMuted)
        }
        .accessibilityElement(children: .combine)
    }

    private var ideologyLabel: String {
        guard let key = model.summary?.beliefKey else { return "" }
        return configStore.config?.ideologyOptions.first { $0.key == key }?.label ?? key.string
    }

    private var header: some View {
        HStack(spacing: GSpace.sm) {
            Text("Topic").gText(.eyebrow).foregroundStyle(Color.gInkMuted)
            Text(model.summary?.topic ?? "")
                .gText(.bodyXS).fontWeight(.semibold).foregroundStyle(Color.gInk)
                .lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)
            if let civility = model.liveCivility {
                VStack(alignment: .trailing, spacing: 1) {
                    Text("Civility").gText(.eyebrow).foregroundStyle(Color.gInkMuted)
                    Text("\(civility)").gText(.mono).fontWeight(.bold).monospacedDigit()
                        .foregroundStyle(Color.gForest)
                        .contentTransition(.numericText())
                }
                .accessibilityElement(children: .combine)
            }
        }
        .padding(.horizontal, GSpace.lg)
        .padding(.vertical, GSpace.md)
        .background(Color.gSurface)
        .overlay(alignment: .bottom) { Divider().overlay(Color.gLine) }
    }

    private var roundBar: some View {
        HStack(spacing: GSpace.md) {
            Text("Round \(model.turnNumber)/\(model.maxTurns)")
                .gText(.eyebrow).foregroundStyle(Color.gInkMuted).monospacedDigit()
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.gBg)
                    Capsule()
                        .fill(LinearGradient(colors: [.gPrimary, .gOchre], startPoint: .leading, endPoint: .trailing))
                        .frame(width: geo.size.width * model.turnProgress)
                        .animation(reduceMotion ? nil : .easeOut(duration: 0.5), value: model.turnProgress)
                }
            }
            .frame(height: 6)
            .accessibilityHidden(true)
            if model.turnNumber >= 2 && !model.atMaxTurns {
                GButton("Wrap up", variant: .outline, size: .sm) {
                    inputFocused = false
                    Task { await model.finish() }
                }
                .disabled(!model.canWrapUp)
            }
        }
        .padding(.horizontal, GSpace.lg)
        .frame(minHeight: 48)
        .overlay(alignment: .bottom) { Divider().overlay(Color.gLine) }
    }

    private var messages: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 14) {
                    if isTranscript, model.analysis == nil { analyzeCard }
                    ForEach(model.lines) { line in
                        VStack(alignment: .trailing, spacing: 6) {
                            MessageBubble(line: line)
                            if let feedback = model.feedback(for: line) {
                                FeedbackCard(feedback: feedback)
                            }
                        }
                        .id(line.id)
                    }
                    if model.isSending {
                        TypingIndicator().id("typing")
                    }
                    Color.clear.frame(height: 1).id("bottom")
                }
                .padding(.horizontal, GSpace.lg)
                .padding(.vertical, GSpace.lg)
            }
            .scrollDismissesKeyboard(.interactively)
            .defaultScrollAnchor(isTranscript ? .top : .bottom)
            .onChange(of: model.lines.count) { scrollToBottom(proxy) }
            .onChange(of: model.isSending) { scrollToBottom(proxy) }
            .onChange(of: inputFocused) { _, focused in
                if focused { scrollToBottom(proxy, delay: 0.35) }
            }
        }
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy, delay: Double = 0) {
        guard !isTranscript else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.25)) { proxy.scrollTo("bottom", anchor: .bottom) }
        }
    }

    private var analyzeCard: some View {
        GCard {
            VStack(spacing: GSpace.sm) {
                Text("Get turn-by-turn feedback on what you did well and what you could try differently.")
                    .gText(.bodyXS).foregroundStyle(Color.gInkSoft).multilineTextAlignment(.center)
                GButton("Analyze", size: .sm, isLoading: model.isAnalyzing) { Task { await model.analyze() } }
                if let error = model.analyzeError {
                    Text(error).gText(.bodyXS).foregroundStyle(Color.gDanger).multilineTextAlignment(.center)
                }
            }
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Input

    @ViewBuilder
    private var inputArea: some View {
        VStack(spacing: GSpace.sm) {
            if let error = model.sendError {
                HStack(alignment: .top, spacing: GSpace.sm) {
                    GIcon(.warning, size: 13).foregroundStyle(Color.gDanger)
                    Text(error).gText(.bodyXS).foregroundStyle(Color.gInk)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Button { model.dismissSendError() } label: { GIcon(.close, size: 12) }
                        .buttonStyle(.plain).foregroundStyle(Color.gInkMuted)
                        .accessibilityLabel("Dismiss")
                }
                .padding(GSpace.md)
                .background(Color.gDanger.opacity(0.1), in: RoundedRectangle(cornerRadius: GRadius.md))
            }
            if model.atMaxTurns {
                VStack(spacing: GSpace.md) {
                    Text("All rounds complete. Let's see how you did.").gText(.bodySM).foregroundStyle(Color.gInkSoft)
                    GButton("See results", isLoading: model.phase == .finishing) { Task { await model.finish() } }
                        .disabled(model.isBusy)
                }
                .frame(maxWidth: .infinity)
            } else {
                composer
            }
        }
        .padding(.horizontal, GSpace.md)
        .padding(.top, GSpace.sm)
        .padding(.bottom, GSpace.sm)
        .background(Color.gBg)
        .overlay(alignment: .top) { Divider().overlay(Color.gLine) }
    }

    private var composer: some View {
        HStack(alignment: .bottom, spacing: GSpace.sm) {
            VStack(alignment: .trailing, spacing: 2) {
                TextField("Your reply…", text: $model.draft, axis: .vertical)
                    .lineLimit(1...6)
                    .font(GFont.font(.body, size: 16, weight: 400, relativeTo: .body))
                    .foregroundStyle(Color.gInk)
                    .focused($inputFocused)
                    .disabled(model.isBusy)
                    .onChange(of: model.draft) { model.limitDraft() }
                    .accessibilityLabel("Your message")
                if model.showsCharacterCount {
                    Text("\(model.draftLength)/\(model.maxChars)")
                        .font(GFont.font(.mono, size: 10, weight: 500, relativeTo: .caption2))
                        .monospacedDigit()
                        .foregroundStyle(model.draftLength >= model.maxChars ? Color.gDanger : Color.gInkMuted)
                }
            }
            .padding(.vertical, 10)
            Button(action: submit) {
                GIcon(.send, size: 16, weight: .bold)
                    .foregroundStyle(Color.gBg)
                    .frame(width: 36, height: 36)
                    .background(Color.gInk, in: Circle())
            }
            .buttonStyle(.plain)
            .disabled(!model.canSend)
            .opacity(model.canSend ? 1 : 0.3)
            .padding(.bottom, 5)
            .accessibilityLabel("Send")
        }
        .padding(.leading, GSpace.lg)
        .padding(.trailing, 6)
        .background(Color.gSurface, in: RoundedRectangle(cornerRadius: GRadius.lg, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: GRadius.lg, style: .continuous)
                .strokeBorder(inputFocused ? Color.gPrimary : Color.gLine, lineWidth: 1)
        )
    }

    private func submit() {
        // Debates started on the web never saw the iOS disclosure; ask before the first message.
        withAIConsent(consent, userId: auth.currentUser?.id, pending: &pendingConsent) {
            Task { await model.send() }
        }
    }

    // MARK: - Finishing overlay

    @ViewBuilder
    private var finishOverlay: some View {
        switch model.phase {
        case .finishing:
            overlayCard {
                AvatarView(stage: 3, size: 88, animate: true)
                Text("Wrapping up…").gText(.displaySM).foregroundStyle(Color.gInk)
                Text("Scoring your conversation and counting feathers.")
                    .gText(.bodySM).foregroundStyle(Color.gInkSoft).multilineTextAlignment(.center)
            }
        case .finishFailed(let message):
            overlayCard {
                AvatarView(stage: 1, size: 88)
                Text(message).gText(.bodySM).foregroundStyle(Color.gInkSoft).multilineTextAlignment(.center)
                HStack(spacing: GSpace.sm) {
                    GButton("Try again", size: .sm) { Task { await model.finish() } }
                    GButton("Back to the chat", variant: .ghost, size: .sm) { model.dismissFinishError() }
                }
            }
        default:
            EmptyView()
        }
    }

    private func overlayCard<C: View>(@ViewBuilder _ content: () -> C) -> some View {
        VStack(spacing: GSpace.md, content: content)
            .padding(GSpace.xxl)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(.ultraThinMaterial)
            .background(Color.gBg.opacity(0.6))
            .accessibilityElement(children: .combine)
            .accessibilityAddTraits(.updatesFrequently)
    }
}

// MARK: - Pieces

/// User: ink bubble, right. Partner: surface bubble with hairline, left, feather disc (`MessageBubble.tsx`).
struct MessageBubble: View {
    let line: ChatLine

    private var isUser: Bool { line.role == .user }

    var body: some View {
        HStack(alignment: .top, spacing: GSpace.sm) {
            if isUser { Spacer(minLength: 48) } else { partnerDisc }
            VStack(alignment: isUser ? .trailing : .leading, spacing: 4) {
                Text(line.content)
                    .font(GFont.font(.body, size: 15, weight: 400, relativeTo: .body))
                    .foregroundStyle(isUser ? Color.gBg : Color.gInk)
                    .textSelection(.enabled)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 11)
                    .background(isUser ? Color.gInk : Color.gSurface, in: bubbleShape)
                    .overlay(bubbleShape.strokeBorder(isUser ? Color.clear : Color.gLine, lineWidth: 1))
                if let score = line.civilityScore {
                    Text("Civility \(Int((score * 10).rounded()))")
                        .font(GFont.font(.mono, size: 9, weight: 600, relativeTo: .caption2))
                        .tracking(0.7)
                        .textCase(.uppercase)
                        .foregroundStyle(Color.gInkMuted)
                }
            }
            if !isUser { Spacer(minLength: 48) }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityText)
    }

    private var partnerDisc: some View {
        GIcon(.feather, size: 13)
            .foregroundStyle(Color.gPrimary)
            .frame(width: 28, height: 28)
            .background(Color.gPrimarySoft, in: Circle())
            .padding(.top, 4)
            .accessibilityHidden(true)
    }

    private var bubbleShape: UnevenRoundedRectangle {
        UnevenRoundedRectangle(
            topLeadingRadius: 16,
            bottomLeadingRadius: isUser ? 16 : 6,
            bottomTrailingRadius: isUser ? 6 : 16,
            topTrailingRadius: 16,
            style: .continuous)
    }

    private var accessibilityText: String {
        var text = (isUser ? "You: " : "Partner: ") + line.content
        if let score = line.civilityScore { text += ". Civility \(Int((score * 10).rounded()))" }
        return text
    }
}

private struct FeedbackCard: View {
    let feedback: TurnFeedback

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            (Text("Nice: ").bold() + Text(feedback.wellDone))
            (Text("Try: ").bold() + Text(feedback.tryInstead))
        }
        .gText(.bodyXS)
        .foregroundStyle(Color.gForest)
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .frame(maxWidth: 300, alignment: .leading)
        .background(Color.gForestSoft, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}

private struct TypingIndicator: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var animating = false

    var body: some View {
        HStack(alignment: .top, spacing: GSpace.sm) {
            GIcon(.feather, size: 13)
                .foregroundStyle(Color.gPrimary)
                .frame(width: 28, height: 28)
                .background(Color.gPrimarySoft, in: Circle())
            HStack(spacing: 4) {
                ForEach(0..<3) { i in
                    Circle()
                        .fill(Color.gInkMuted)
                        .frame(width: 6, height: 6)
                        .opacity(animating ? 0.25 : 1)
                        .animation(reduceMotion ? nil :
                                    .easeInOut(duration: 0.6).repeatForever().delay(Double(i) * 0.15),
                                   value: animating)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Color.gSurface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Color.gLine, lineWidth: 1))
            Spacer()
        }
        .onAppear { animating = true }
        .accessibilityElement()
        .accessibilityLabel("Your partner is typing")
    }
}

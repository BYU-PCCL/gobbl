import SwiftUI

/// Set up a debate (web: `chat/page.tsx`). Root of the Debate tab, and pushed from the dashboard's
/// Daily Gobble card with `isDaily`. Starting asks for AI consent once, then shows a full-screen
/// pairing state while the server generates the partner's opening line.
struct DebateSetupView: View {
    let isDaily: Bool

    @Environment(\.appEnvironment) private var env
    @State private var model: DebateSetupViewModel?

    var body: some View {
        Group {
            if let model {
                SetupContent(model: model)
            } else {
                Color.gBg
            }
        }
        .background(Color.gBg.ignoresSafeArea())
        .task {
            if model == nil, let env {
                model = DebateSetupViewModel(isDaily: isDaily, client: env.client)
            }
        }
    }
}

private struct SetupContent: View {
    @Bindable var model: DebateSetupViewModel

    @Environment(AuthStore.self) private var auth
    @Environment(ConfigStore.self) private var configStore
    @Environment(ProfileStore.self) private var profileStore
    @Environment(AIConsentStore.self) private var consent
    @Environment(AppRouter.self) private var router
    @State private var showsTopicPicker = false
    @State private var pendingConsent: (() -> Void)?

    private var config: AppConfig? { configStore.config }
    private var topic: Topic? { model.topic(in: config) }
    private var partnerName: String { model.partner?.initials ?? "your partner" }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: GSpace.xxl) {
                VStack(alignment: .leading, spacing: GSpace.sm) {
                    Text(model.isDaily ? "Daily Gobble" : "New debate")
                        .gText(.bodySM).fontWeight(.semibold).foregroundStyle(Color.gPrimary)
                    Text("Set up your debate.").gText(.displayXL).foregroundStyle(Color.gInk)
                    Text("Pick a topic and how hard you want \(partnerName) to push back.")
                        .gText(.bodySM).foregroundStyle(Color.gInkSoft)
                }
                if config == nil {
                    configMissing
                } else {
                    topicSection
                    partnerNote
                    difficultySection
                    startSection
                }
            }
            .padding(.horizontal, GSpace.gutter)
            .padding(.vertical, GSpace.lg)
        }
        .background(Color.gBg.ignoresSafeArea())
        .navigationTitle(model.isDaily ? "Daily Gobble" : "Debate")
        .navigationBarTitleDisplayMode(.inline)
        .overlay { if model.isStarting { PairingView(partner: model.partner?.initials) } }
        .toolbar(model.isStarting ? .hidden : .automatic, for: .navigationBar)
        .sheet(isPresented: $showsTopicPicker) {
            TopicPicker(topics: config?.topics ?? [], selectedId: $model.selectedTopicId)
        }
        .aiConsentGate(pending: $pendingConsent, userId: auth.currentUser?.id)
        .task(id: model.difficulty) { await model.loadPartner() }
        .task { if profileStore.current == nil { await profileStore.refresh() } }
        .task { if config == nil { await configStore.refresh() } }
    }

    // MARK: - Sections

    private var configMissing: some View {
        GCard {
            VStack(alignment: .leading, spacing: GSpace.md) {
                if configStore.isLoading {
                    ProgressView().frame(maxWidth: .infinity)
                } else {
                    Text("Couldn't load the topics.").gText(.displaySM)
                    Text(configStore.lastError ?? "Check your connection and try again.")
                        .gText(.bodySM).foregroundStyle(Color.gInkSoft)
                    GButton("Try again", variant: .outline, size: .sm, icon: .refresh) {
                        Task { await configStore.refresh() }
                    }
                }
            }
        }
    }

    private var topicSection: some View {
        VStack(alignment: .leading, spacing: GSpace.md) {
            sectionTitle("Topic")
            if model.isDaily {
                if let topic {
                    selectionCard(selected: true) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("\(topic.category) · Daily").gText(.eyebrow).foregroundStyle(Color.gPrimary)
                            Text(topic.title).gText(.displaySM).foregroundStyle(Color.gInk)
                            if let bonus = config?.rules.dailyBonusFeathers {
                                Text("+\(bonus) feathers · daily bonus").gText(.bodyXS).foregroundStyle(Color.gInkSoft)
                            }
                        }
                    }
                }
            } else {
                Button { showsTopicPicker = true } label: {
                    selectionCard(selected: topic != nil) {
                        HStack(spacing: GSpace.md) {
                            if let topic {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(topic.category).gText(.eyebrow).foregroundStyle(Color.gPrimary)
                                    Text(topic.title).gText(.displaySM).foregroundStyle(Color.gInk)
                                        .multilineTextAlignment(.leading)
                                    Text(topic.description).gText(.bodyXS).foregroundStyle(Color.gInkSoft)
                                        .lineLimit(2).multilineTextAlignment(.leading)
                                }
                            } else {
                                Text("Choose a topic…").gText(.bodySM).foregroundStyle(Color.gInkMuted)
                            }
                            Spacer(minLength: 0)
                            GIcon(.chevronDown, size: 14).foregroundStyle(Color.gInkMuted)
                        }
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(topic.map { "Topic: \($0.title)" } ?? "Choose a topic")
                .accessibilityHint("Opens the topic list")
            }
        }
    }

    private var partnerNote: some View {
        HStack(spacing: GSpace.md) {
            GIcon(.debate, size: 13)
                .foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(Color.gForest, in: Circle())
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text("\(model.partner?.initials ?? "Your partner") opposes you today.")
                    .gText(.bodyXS).fontWeight(.bold).foregroundStyle(Color.gForest)
                Text(BeliefKey.describeFlip(user: profileStore.current?.beliefKey, partner: model.partner?.beliefKey))
                    .gText(.bodyXS).foregroundStyle(Color.gInkSoft)
            }
            Spacer(minLength: 0)
        }
        .padding(GSpace.md)
        .background(Color.gForestSoft, in: RoundedRectangle(cornerRadius: GRadius.lg, style: .continuous))
        .accessibilityElement(children: .combine)
    }

    private var difficultySection: some View {
        VStack(alignment: .leading, spacing: GSpace.md) {
            sectionTitle("Difficulty")
            ForEach(config?.difficulties ?? []) { def in
                difficultyRow(def)
            }
            if model.isFullGobble {
                Toggle(isOn: $model.allowProfanity) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Allow profanity").gText(.bodySM).fontWeight(.semibold).foregroundStyle(Color.gInk)
                        Text("\(model.partner?.initials ?? "Your partner") may curse when things get heated. No slurs, ever.")
                            .gText(.bodyXS).foregroundStyle(Color.gInkSoft)
                    }
                }
                .tint(Color.gDanger)
                .padding(GSpace.md)
                .background(Color.gSurface, in: RoundedRectangle(cornerRadius: GRadius.lg, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: GRadius.lg, style: .continuous).strokeBorder(Color.gLine))
            }
        }
    }

    private func difficultyRow(_ def: DifficultyDef) -> some View {
        let selected = model.difficulty == def.key
        let tone = tint(def.key)
        return Button {
            model.difficulty = def.key
        } label: {
            HStack(spacing: GSpace.md) {
                AvatarView(stage: def.key.setupStage, size: 48, showShadow: false)
                    .frame(width: 56, height: 56)
                    .background(tone.opacity(0.14), in: RoundedRectangle(cornerRadius: GRadius.lg, style: .continuous))
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text(def.label).gText(.body).fontWeight(.bold).foregroundStyle(tone)
                    Text(def.description).gText(.bodyXS).foregroundStyle(Color.gInkSoft)
                }
                Spacer(minLength: 0)
                if def.multiplier > 1 {
                    Text("×" + multiplierText(def.multiplier) + " XP")
                        .font(GFont.font(.mono, size: 11, weight: 600, relativeTo: .caption))
                        .foregroundStyle(tone)
                }
            }
            .padding(GSpace.md)
            .background(Color.gSurface, in: RoundedRectangle(cornerRadius: GRadius.lg, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: GRadius.lg, style: .continuous)
                    .strokeBorder(selected ? tone : Color.gLine, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private var startSection: some View {
        VStack(spacing: GSpace.md) {
            if let error = model.startError {
                Text(error).gText(.bodySM).foregroundStyle(Color.gDanger).multilineTextAlignment(.center)
            }
            GButton(topic == nil ? "Pick a topic to continue" : "Start the debate",
                    size: .lg, isLoading: model.isStarting, isFullWidth: true, action: requestStart)
                .disabled(topic == nil)
                .gShadowLift()
        }
        .padding(.top, GSpace.sm)
    }

    // MARK: - Actions

    private func requestStart() {
        withAIConsent(consent, userId: auth.currentUser?.id, pending: &pendingConsent) {
            Task { await start() }
        }
    }

    private func start() async {
        switch await model.start(config: config) {
        case .opened(let id), .dailyAlreadyDone(let id):
            router.openDebate(id: id)
        case nil:
            break
        }
    }

    // MARK: - Helpers

    private func sectionTitle(_ title: String) -> some View {
        Text(title).gText(.displaySM).foregroundStyle(Color.gInk).accessibilityAddTraits(.isHeader)
    }

    private func selectionCard<C: View>(selected: Bool, @ViewBuilder _ content: () -> C) -> some View {
        content()
            .padding(GSpace.lg)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.gSurface, in: RoundedRectangle(cornerRadius: GRadius.lg, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: GRadius.lg, style: .continuous)
                    .strokeBorder(selected ? Color.gPrimary : Color.gLine, lineWidth: 2)
            )
    }

    private func tint(_ tier: DifficultyTier) -> Color {
        switch tier {
        case .friendlyCluck: return .gForest
        case .spiritedStrut: return .gPrimary
        case .fullGobble: return .gDanger
        case .unknown: return .gInk
        }
    }

    private func multiplierText(_ m: Double) -> String {
        m == m.rounded() ? String(Int(m)) : String(format: "%g", m)
    }
}

/// Topic list in a sheet, grouped by category in server order.
private struct TopicPicker: View {
    let topics: [Topic]
    @Binding var selectedId: String?
    @Environment(\.dismiss) private var dismiss

    private var categories: [String] {
        var seen = Set<String>()
        return topics.map(\.category).filter { seen.insert($0).inserted }
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(categories, id: \.self) { category in
                    Section(category) {
                        ForEach(topics.filter { $0.category == category }) { topic in
                            Button {
                                selectedId = topic.id
                                dismiss()
                            } label: {
                                HStack(spacing: GSpace.md) {
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(topic.title).gText(.bodySM).fontWeight(.semibold)
                                            .foregroundStyle(Color.gInk)
                                        Text(topic.description).gText(.bodyXS).foregroundStyle(Color.gInkSoft)
                                            .lineLimit(2)
                                    }
                                    Spacer(minLength: 0)
                                    if selectedId == topic.id {
                                        GIcon(.check, size: 14).foregroundStyle(Color.gPrimary)
                                    }
                                }
                            }
                            .accessibilityAddTraits(selectedId == topic.id ? .isSelected : [])
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Color.gBg)
            .navigationTitle("Choose a topic")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

/// Full-screen state while `POST /api/debates` generates the opening line (5-20 s).
private struct PairingView: View {
    let partner: String?

    var body: some View {
        VStack(spacing: GSpace.lg) {
            AvatarView(stage: 5, size: 120, animate: true)
            Text("Finding \(partner ?? "your partner")…").gText(.displayMD).foregroundStyle(Color.gInk)
            Text("They're reading up on the topic and thinking of an opening line.")
                .gText(.bodySM).foregroundStyle(Color.gInkSoft).multilineTextAlignment(.center)
            ProgressView().tint(Color.gInkMuted)
        }
        .padding(GSpace.xxxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.gBg.ignoresSafeArea())
        .accessibilityElement(children: .combine)
    }
}

import SwiftUI

/// Onboarding survey (web: `onboarding/survey/page.tsx`). Presented as a non-dismissable full-screen cover
/// until `auth.needsOnboarding` clears, so it carries its own quiet "Sign out" escape hatch.
struct SurveyView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(ConfigStore.self) private var configStore

    var body: some View {
        ZStack {
            Color.gBg.ignoresSafeArea()
            if let questions = configStore.config?.survey.questions, !questions.isEmpty {
                SurveyContent(questions: questions, auth: auth)
            } else {
                loading
            }
        }
        .task { if configStore.config == nil { await configStore.refresh() } }
    }

    private var loading: some View {
        VStack(spacing: GSpace.lg) {
            header
            if configStore.isLoading || configStore.lastError == nil {
                ProgressView()
            } else {
                Text(configStore.lastError ?? "Couldn't load the questions.")
                    .gText(.bodySM).foregroundStyle(Color.gDanger)
                    .multilineTextAlignment(.center)
                GButton("Try again", variant: .secondary) { Task { await configStore.refresh() } }
            }
            GButton("Sign out", variant: .ghost, size: .sm) { auth.signOut(.userRequested) }
        }
        .padding(GSpace.gutter)
    }

    private var header: some View { SurveyHeader() }
}

struct SurveyHeader: View {
    var body: some View {
        VStack(spacing: 4) {
            Text("Quick intro").gText(.displayMD).foregroundStyle(Color.gInk)
            Text("A few questions before you start.").gText(.bodySM).foregroundStyle(Color.gInkSoft)
        }
        .multilineTextAlignment(.center)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
    }
}

private struct SurveyContent: View {
    let auth: AuthStore
    @State private var model: SurveyViewModel

    init(questions: [SurveyQuestion], auth: AuthStore) {
        self.auth = auth
        _model = State(initialValue: SurveyViewModel(questions: questions, auth: auth))
    }

    var body: some View {
        VStack(spacing: GSpace.xxl) {
            HStack {
                Spacer()
                GButton("Sign out", variant: .ghost, size: .sm) { auth.signOut(.userRequested) }
            }
            SurveyHeader()
            progressDots
            ScrollView {
                if let question = model.question {
                    VStack(alignment: .leading, spacing: GSpace.lg) {
                        Text(question.prompt ?? "").gText(.displaySM).foregroundStyle(Color.gInk)
                            .accessibilityAddTraits(.isHeader)
                        QuestionInput(question: question, value: model.currentAnswer) { model.setAnswer($0) }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .id(question.key)
                }
            }
            .scrollDismissesKeyboard(.interactively)
            if let message = model.errorMessage {
                Text(message).gText(.bodySM).foregroundStyle(Color.gDanger)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            HStack {
                GButton("Back", variant: .secondary) { model.back() }
                    .disabled(!model.canGoBack)
                Spacer()
                GButton(model.isSubmitting ? "Saving..." : (model.isLast ? "Finish" : "Next"),
                        isLoading: model.isSubmitting) {
                    Task { await model.next() }
                }
                .disabled(!model.canAdvance)
            }
        }
        .padding(.horizontal, GSpace.gutter)
        .padding(.vertical, GSpace.lg)
        .frame(maxWidth: 520)
        .animation(.easeOut(duration: 0.2), value: model.step)
    }

    private var progressDots: some View {
        HStack(spacing: GSpace.sm) {
            ForEach(0..<model.questions.count, id: \.self) { i in
                Circle()
                    .fill(i <= model.step ? Color.gPrimary : Color.gLine)
                    .frame(width: 8, height: 8)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Question \(model.step + 1) of \(model.questions.count)")
    }
}

private struct QuestionInput: View {
    let question: SurveyQuestion
    let value: String
    let onChange: (String) -> Void

    var body: some View {
        switch question {
        case .singleChoice(_, _, let options):
            VStack(spacing: GSpace.sm) {
                ForEach(options) { option in
                    let selected = value == option.value
                    Button { onChange(option.value) } label: {
                        Text(option.label)
                            .font(GFont.font(.body, size: 15, weight: 600, relativeTo: .body))
                            .foregroundStyle(selected ? Color.gPrimaryDeep : Color.gInk)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, GSpace.lg)
                            .padding(.vertical, GSpace.md)
                            .background(selected ? Color.gPrimarySoft : Color.gSurface,
                                        in: RoundedRectangle(cornerRadius: GRadius.base, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: GRadius.base, style: .continuous)
                                    .strokeBorder(selected ? Color.gPrimary : Color.gLine, lineWidth: 2)
                            )
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(selected ? .isSelected : [])
                }
            }
        case .shortText(_, _, let maxLength):
            VStack(alignment: .trailing, spacing: 4) {
                TextField("Type your answer…", text: Binding(get: { value }, set: onChange), axis: .vertical)
                    .lineLimit(3...6)
                    .font(GFont.font(.body, size: 15, weight: 400, relativeTo: .body))
                    .foregroundStyle(Color.gInk)
                    .padding(GSpace.md)
                    .background(Color.gSurface, in: RoundedRectangle(cornerRadius: GRadius.base, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: GRadius.base, style: .continuous)
                            .strokeBorder(Color.gLine, lineWidth: 2)
                    )
                Text("\(value.count)/\(maxLength)").gText(.bodyXS).foregroundStyle(Color.gInkMuted)
            }
        case .unknown:
            EmptyView()
        }
    }
}

#Preview {
    SurveyView().gobblEnvironment(.preview(session: MobileSession(
        accessToken: "preview", expiresAt: Date().addingTimeInterval(86_400),
        user: AuthUser(id: "p", username: "PreviewTurkey", onboardingCompletedAt: nil))))
}

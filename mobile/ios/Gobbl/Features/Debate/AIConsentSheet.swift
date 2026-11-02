import SwiftUI

/// One-time disclosure that debate text goes to a third-party AI (App Review guideline 5.1.2(i)).
/// Copy follows `src/app/privacy/page.tsx`.
struct AIConsentSheet: View {
    var onAgree: () -> Void
    var onDecline: () -> Void

    @Environment(\.appEnvironment) private var env

    private static let xaiPrivacy = URL(string: "https://x.ai/legal/privacy-policy")!

    private var gobblPrivacy: URL? {
        env.map { $0.baseURL.appendingPathComponent("privacy") }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: GSpace.xl) {
                HStack {
                    Spacer()
                    AvatarView(stage: 3, size: 88)
                    Spacer()
                }
                .padding(.top, GSpace.lg)
                .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: GSpace.sm) {
                    GEyebrow("Before your first debate", color: .gPrimary)
                    Text("Your partner is an AI.").gText(.displayMD).foregroundStyle(Color.gInk)
                }

                VStack(alignment: .leading, spacing: GSpace.md) {
                    point(.debate, "What you type in a debate is sent to xAI (Grok) to write your partner's replies and to score civility.")
                    point(.profile, "Your username is not sent. Only the debate text is.")
                    point(.lock, "How xAI handles that text is covered by its privacy policy. Gobbl's own policy explains the rest.")
                }

                VStack(alignment: .leading, spacing: GSpace.sm) {
                    if let gobblPrivacy {
                        Link(destination: gobblPrivacy) { linkLabel("Gobbl privacy policy") }
                    }
                    Link(destination: Self.xaiPrivacy) { linkLabel("xAI privacy policy") }
                }

                VStack(spacing: GSpace.sm) {
                    GButton("Agree and continue", size: .lg, isFullWidth: true, action: onAgree)
                    GButton("Not now", variant: .ghost, isFullWidth: true, action: onDecline)
                }
                .padding(.top, GSpace.sm)
            }
            .padding(.horizontal, GSpace.gutter)
            .padding(.bottom, GSpace.xxl)
        }
        .background(Color.gBg.ignoresSafeArea())
        .presentationDetents([.large])
        .interactiveDismissDisabled()
    }

    private func point(_ icon: GIconName, _ text: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: GSpace.md) {
            GIcon(icon, size: 15).foregroundStyle(Color.gPrimary).accessibilityHidden(true)
            Text(text).gText(.bodySM).foregroundStyle(Color.gInkSoft)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func linkLabel(_ title: String) -> some View {
        HStack(spacing: 6) {
            Text(title).gText(.bodySM).fontWeight(.semibold)
            GIcon(.arrowRight, size: 12)
        }
        .foregroundStyle(Color.gPrimary)
    }
}

extension View {
    /// Runs `pending` only after consent. Set `pending` to the action that needs consent; the sheet
    /// appears, and "Agree" records consent for `userId` and runs it. "Not now" drops it.
    func aiConsentGate(pending: Binding<(() -> Void)?>, userId: String?) -> some View {
        modifier(AIConsentGate(pending: pending, userId: userId))
    }
}

private struct AIConsentGate: ViewModifier {
    @Binding var pending: (() -> Void)?
    let userId: String?
    @Environment(AIConsentStore.self) private var consent

    func body(content: Content) -> some View {
        content.sheet(isPresented: Binding(get: { pending != nil }, set: { if !$0 { pending = nil } })) {
            AIConsentSheet(
                onAgree: {
                    if let userId { consent.grant(userId: userId) }
                    let action = pending
                    pending = nil
                    action?()
                },
                onDecline: { pending = nil })
        }
    }
}

/// Wraps an action so it runs immediately when the user has consented, or asks first.
@MainActor
func withAIConsent(_ consent: AIConsentStore, userId: String?, pending: inout (() -> Void)?,
                   _ action: @escaping () -> Void) {
    if let userId, consent.hasConsented(userId: userId) {
        action()
    } else {
        pending = action
    }
}

#Preview {
    AIConsentSheet(onAgree: {}, onDecline: {})
        .gobblEnvironment(.preview())
}

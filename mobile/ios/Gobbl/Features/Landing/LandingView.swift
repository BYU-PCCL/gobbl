import SwiftUI

/// The signed-out front door (`src/app/page.tsx`): hero, the eight stages, three promises.
/// Login and registration push onto the stack; an account-missing sign-out lands on login directly.
struct LandingView: View {
    var signOutReason: SignOutReason?
    @State private var path: [AuthMode] = []

    private static let promises: [(title: String, body: String)] = [
        ("Talk with someone who disagrees",
         "Your AI partner holds the opposite view on the topic you pick, and pushes back as hard as you choose."),
        ("Get scored on civility, not winning",
         "Every message is scored for tone, evidence, empathy, constructive framing and listening."),
        ("Grow your turkey",
         "XP from good conversations evolves your turkey through eight stages. Feathers buy it an outfit."),
    ]

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    header
                    hero
                    growthLine
                    promises
                    footer
                }
            }
            .background(Color.gBg.ignoresSafeArea())
            .gHideNavigationBar()
            .navigationDestination(for: AuthMode.self) { mode in
                AuthFormView(mode: mode, signOutReason: signOutReason)
            }
        }
        .onAppear {
            if signOutReason == .accountMissing || signOutReason == .sessionExpired {
                path = [.login]
            }
        }
    }

    private var header: some View {
        HStack {
            HStack(spacing: GSpace.sm) {
                AvatarView(stage: 5, size: 30, showShadow: false)
                Text("Gobbl").gText(.displayMD).foregroundStyle(Color.gInk)
            }
            Spacer()
            GButton("Sign in", variant: .ghost, size: .sm) { path = [.login] }
        }
        .padding(.horizontal, GSpace.gutter)
        .padding(.vertical, GSpace.lg)
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: GSpace.xxl) {
            Text("Talk turkey.\nBuild bridges.")
                .gText(.display2XL)
                .foregroundStyle(Color.gInk)
                .fixedSize(horizontal: false, vertical: true)
            Text("Practice political conversations with an AI partner who sees things differently. You're scored on how civil you are, not on whether you win.")
                .gText(.body)
                .foregroundStyle(Color.gInkSoft)
                .fixedSize(horizontal: false, vertical: true)
            VStack(spacing: GSpace.md) {
                GButton("Get started", size: .lg, isFullWidth: true) { path = [.register] }
                    .gShadowLift()
                GButton("I have an account", variant: .secondary, size: .lg, isFullWidth: true) { path = [.login] }
            }
        }
        .padding(.horizontal, GSpace.gutter)
        .padding(.top, GSpace.xl)
        .padding(.bottom, GSpace.xxxl)
    }

    /// Each stage stands a little taller than the last, so the row reads as growth.
    private var growthLine: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .bottom, spacing: GSpace.xl) {
                ForEach(TurkeyStage.range, id: \.self) { stage in
                    VStack(spacing: GSpace.sm) {
                        AvatarView(stage: stage, size: CGFloat(44 + (stage - 1) * 12), animate: stage == 8)
                        Text(TurkeyStage.label(stage))
                            .font(GFont.font(.body, size: 12, weight: 600, relativeTo: .caption))
                            .foregroundStyle(Color.gInkMuted)
                    }
                }
            }
            .padding(.horizontal, GSpace.gutter)
            .padding(.top, GSpace.xxl)
            .padding(.bottom, GSpace.md)
        }
        .overlay(alignment: .bottom) { Rectangle().fill(Color.gLine).frame(height: 1) }
        .accessibilityLabel("The eight turkey stages")
    }

    private var promises: some View {
        VStack(alignment: .leading, spacing: GSpace.xxl) {
            ForEach(Self.promises, id: \.title) { promise in
                VStack(alignment: .leading, spacing: GSpace.sm) {
                    Text(promise.title).gText(.displaySM).foregroundStyle(Color.gInk)
                    Text(promise.body).gText(.bodySM).foregroundStyle(Color.gInkSoft)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .padding(.horizontal, GSpace.gutter)
        .padding(.vertical, GSpace.xxxl)
    }

    private var footer: some View {
        VStack(alignment: .leading, spacing: GSpace.md) {
            Rectangle().fill(Color.gLine).frame(height: 1)
            Text("Gobbl. Civil discourse practice.").gText(.bodySM).foregroundStyle(Color.gInkMuted)
            Button {
                path = [.register]
            } label: {
                HStack(spacing: 6) {
                    Text("Start your first conversation")
                    GIcon(.chevronRight, size: 12)
                }
                .font(GFont.font(.body, size: 14, weight: 600, relativeTo: .subheadline))
                .foregroundStyle(Color.gPrimary)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, GSpace.gutter)
        .padding(.bottom, GSpace.xxxl)
    }
}

#Preview {
    LandingView(signOutReason: nil).gobblEnvironment(.preview())
}

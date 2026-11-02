import SwiftUI

/// Login and registration (`page.tsx` modes "login" / "register").
struct AuthFormView: View {
    @Environment(AuthStore.self) private var auth
    @State private var model = AuthFormViewModel()
    @State var mode: AuthMode
    var signOutReason: SignOutReason?
    @FocusState private var focus: Field?

    private enum Field { case username, password }

    init(mode: AuthMode, signOutReason: SignOutReason? = nil) {
        _mode = State(initialValue: mode)
        self.signOutReason = signOutReason
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: GSpace.xxl) {
                header
                if let notice = reasonNotice {
                    Text(notice)
                        .gText(.bodySM)
                        .foregroundStyle(Color.gInkSoft)
                        .padding(.horizontal, GSpace.lg)
                        .padding(.vertical, GSpace.md)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.gSurface, in: RoundedRectangle(cornerRadius: GRadius.md, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: GRadius.md, style: .continuous).strokeBorder(Color.gLine))
                        .accessibilityAddTraits(.isStaticText)
                }
                form
                switchRow
            }
            .padding(.horizontal, GSpace.gutter)
            .padding(.top, GSpace.lg)
            .padding(.bottom, GSpace.xxxl * 2)
            .frame(maxWidth: 440)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Color.gBg.ignoresSafeArea())
        .navigationTitle("")
        .gInlineTitle()
        .onAppear { focus = .username }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: GSpace.lg) {
            AvatarView(stage: mode.heroStage, size: mode == .login ? 96 : 72)
            VStack(alignment: .leading, spacing: GSpace.sm) {
                Text(mode.title).gText(.displayLG).foregroundStyle(Color.gInk)
                Text(mode.subtitle).gText(.bodySM).foregroundStyle(Color.gInkSoft)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: mode)
    }

    private var form: some View {
        VStack(alignment: .leading, spacing: GSpace.lg) {
            GTextField(label: "Username", text: $model.username,
                       placeholder: mode.usernamePlaceholder, kind: .username,
                       submitLabel: .next) { focus = .password }
                .focused($focus, equals: .username)
            GTextField(label: "Password", text: $model.password,
                       placeholder: mode.passwordPlaceholder,
                       kind: mode == .login ? .currentPassword : .newPassword,
                       submitLabel: .go) { submit() }
                .focused($focus, equals: .password)
            if let error = model.errorMessage {
                Text(error)
                    .gText(.bodySM)
                    .foregroundStyle(Color.gDanger)
                    .accessibilityAddTraits(.isStaticText)
            }
            GButton(mode.submitTitle, size: .lg, isLoading: model.isSubmitting, isFullWidth: true) { submit() }
                .disabled(!model.canSubmit)
        }
    }

    private var switchRow: some View {
        HStack(spacing: 4) {
            Text(mode.switchPrompt).gText(.bodySM).foregroundStyle(Color.gInkSoft)
            Button(mode.switchTitle) {
                mode = mode.other
                model.errorMessage = nil
            }
            .font(GFont.font(.body, size: 14, weight: 600, relativeTo: .subheadline))
            .foregroundStyle(Color.gPrimary)
        }
    }

    private var reasonNotice: String? {
        switch signOutReason {
        case .accountMissing:
            return "We couldn't find your account, so you've been signed out. Sign in again, or create a new account if yours was never moved over."
        case .sessionExpired:
            return "Your session ended. Sign in again to keep going."
        case .accountDeleted:
            return "Your account and its data were deleted."
        case .userRequested, .none:
            return nil
        }
    }

    private func submit() {
        guard model.canSubmit else { return }
        Task { await model.submit(mode: mode, auth: auth) }
    }
}

extension View {
    /// `.navigationBarTitleDisplayMode(.inline)` is iOS-only; the macOS typecheck build skips it.
    @ViewBuilder
    func gInlineTitle() -> some View {
        #if os(iOS)
        self.navigationBarTitleDisplayMode(.inline)
        #else
        self
        #endif
    }
}

#Preview("Login") {
    NavigationStack { AuthFormView(mode: .login, signOutReason: .accountMissing) }
        .gobblEnvironment(.preview())
}

#Preview("Register") {
    NavigationStack { AuthFormView(mode: .register) }
        .gobblEnvironment(.preview())
}

extension View {
    /// `.toolbar(.hidden, for: .navigationBar)` is iOS-only; the macOS typecheck build skips it.
    @ViewBuilder
    func gHideNavigationBar() -> some View {
        #if os(iOS)
        self.toolbar(.hidden, for: .navigationBar)
        #else
        self
        #endif
    }
}

import SwiftUI

/// Labelled pill text field (`Input.tsx`) with error text. `isSecure` renders a password field.
struct GTextField: View {
    enum Kind { case username, newPassword, currentPassword, plain }

    let label: String
    @Binding var text: String
    var placeholder = ""
    var kind: Kind = .plain
    var error: String? = nil
    var hint: String? = nil
    var submitLabel: SubmitLabel = .next
    var onSubmit: (() -> Void)? = nil

    @FocusState private var isFocused: Bool
    @State private var revealPassword = false

    private var isSecure: Bool { kind == .newPassword || kind == .currentPassword }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(GFont.font(.body, size: 14, weight: 500, relativeTo: .subheadline))
                .foregroundStyle(Color.gInk)

            HStack(spacing: GSpace.sm) {
                field
                    .font(GFont.font(.body, size: 15, weight: 400, relativeTo: .body))
                    .foregroundStyle(Color.gInk)
                    .focused($isFocused)
                    .submitLabel(submitLabel)
                    .onSubmit { onSubmit?() }
                    .gFieldTraits(kind)
                if isSecure {
                    Button {
                        revealPassword.toggle()
                    } label: {
                        GIcon(revealPassword ? .eyeSlash : .eye, size: 16, weight: .regular)
                            .foregroundStyle(Color.gInkMuted)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(revealPassword ? "Hide password" : "Show password")
                }
            }
            .padding(.horizontal, 16)
            .frame(minHeight: 46)
            .background(Color.gSurface, in: Capsule())
            .overlay(Capsule().strokeBorder(borderColor, lineWidth: isFocused ? 1.5 : 1))
            .overlay(
                Capsule().strokeBorder(ringColor, lineWidth: 4).padding(-4).opacity(isFocused ? 1 : 0)
            )
            .animation(.easeOut(duration: 0.15), value: isFocused)

            if let error {
                Text(error)
                    .gText(.bodyXS)
                    .foregroundStyle(Color.gDanger)
                    .accessibilityAddTraits(.isStaticText)
            } else if let hint {
                Text(hint).gText(.bodyXS).foregroundStyle(Color.gInkSoft)
            }
        }
    }

    @ViewBuilder
    private var field: some View {
        if isSecure, !revealPassword {
            SecureField(placeholder, text: $text)
        } else {
            TextField(placeholder, text: $text)
        }
    }

    private var borderColor: Color {
        if error != nil { return .gDanger }
        return isFocused ? .gPrimary : .gLine
    }

    private var ringColor: Color {
        (error != nil ? Color.gDanger : Color.gPrimary).opacity(0.2)
    }
}

private extension View {
    /// Keyboard and autofill traits are UIKit-only; the macOS build (used for typechecking) skips them.
    @ViewBuilder
    func gFieldTraits(_ kind: GTextField.Kind) -> some View {
        #if os(iOS)
        switch kind {
        case .username:
            self.textContentType(.username)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.asciiCapable)
        case .newPassword:
            self.textContentType(.newPassword)
        case .currentPassword:
            self.textContentType(.password)
        case .plain:
            self
        }
        #else
        self
        #endif
    }
}

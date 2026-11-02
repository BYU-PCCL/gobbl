import SwiftUI

/// Selectable pill (`Chip.tsx`): filter tabs, difficulty picks, coach prompts.
struct GChip: View {
    let title: String
    var isSelected = false
    var icon: GIconName? = nil
    var action: (() -> Void)? = nil

    init(_ title: String, isSelected: Bool = false, icon: GIconName? = nil, action: (() -> Void)? = nil) {
        self.title = title
        self.isSelected = isSelected
        self.icon = icon
        self.action = action
    }

    var body: some View {
        Button {
            action?()
        } label: {
            HStack(spacing: 6) {
                if let icon { GIcon(icon, size: 13) }
                Text(title)
            }
            .font(GFont.font(.body, size: 13, weight: 600, relativeTo: .footnote))
            .padding(.horizontal, 14)
            .frame(minHeight: 34)
            .foregroundStyle(isSelected ? Color.gBg : Color.gInk)
            .background(isSelected ? Color.gInk : Color.gSurface, in: Capsule())
            .overlay(Capsule().strokeBorder(isSelected ? Color.clear : Color.gLine, lineWidth: 1))
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .disabled(action == nil)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

import SwiftUI

@main
struct GobblApp: App {
    @State private var environment = AppEnvironment.live()

    var body: some Scene {
        WindowGroup {
            RootView()
                .gobblEnvironment(environment)
        }
    }
}

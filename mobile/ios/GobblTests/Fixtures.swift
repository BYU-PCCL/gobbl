import Foundation
import XCTest
@testable import Gobbl

/// Loads `GobblTests/Fixtures/*.json` (captured by `scripts/capture-fixtures.sh`).
enum Fixtures {
    static func data(_ name: String, file: StaticString = #filePath, line: UInt = #line) throws -> Data {
        let bundle = Bundle(for: FixtureBundleToken.self)
        guard let url = bundle.url(forResource: name, withExtension: "json")
                ?? bundle.url(forResource: name, withExtension: "json", subdirectory: "Fixtures") else {
            XCTFail("Missing fixture \(name).json in the test bundle", file: file, line: line)
            throw CocoaError(.fileNoSuchFile)
        }
        return try Data(contentsOf: url)
    }

    static func decode<T: Decodable>(_ type: T.Type, _ name: String,
                                     file: StaticString = #filePath, line: UInt = #line) throws -> T {
        try JSONCoding.decoder.decode(T.self, from: data(name, file: file, line: line))
    }
}

private final class FixtureBundleToken {}

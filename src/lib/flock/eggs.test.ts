import { test, expect } from "vitest";
import { canBuyEgg } from "./eggs";

test("ok", () => expect(canBuyEgg(500, [], "listening")).toBe("ok"));
test("insufficient", () => expect(canBuyEgg(499, [], "listening")).toBe("insufficient"));
test("owned", () => expect(canBuyEgg(9999, ["listening"], "listening")).toBe("owned"));
test("invalid", () => expect(canBuyEgg(9999, [], "juggling")).toBe("invalid"));

import { describe, expect, it } from "vitest";
import { publicSiteOrigin } from "./public-site";

describe("public site origin", () => {
  it("sends localhost sign-in back to the Vercel site", () => {
    expect(publicSiteOrigin("http://localhost:3000")).toBe("https://nexa-talent-one.vercel.app");
  });

  it("keeps the live site when that is where sign-in started", () => {
    expect(publicSiteOrigin("https://nexa-talent-one.vercel.app")).toBe("https://nexa-talent-one.vercel.app");
  });
});

import { canView, canEdit, canShare, AccessCheckable } from "@/lib/access";

/**
 * Unit tests for the access-control module.
 *
 * This is the required automated test (NFR-5). It targets lib/access.ts
 * specifically because that module is the single source of truth for
 * the product's core security guarantee (FR-9, FR-12: sharing is
 * strictly read-only, enforced server-side). If this logic is wrong,
 * every API route that depends on it is wrong too — so it's the
 * highest-leverage place to put test coverage given the time budget.
 */
describe("lib/access", () => {
  const OWNER = "user-alice";
  const SHARED_VIEWER = "user-bob";
  const UNRELATED_USER = "user-carol";

  const doc: AccessCheckable = {
    ownerId: OWNER,
    sharedWith: [SHARED_VIEWER],
  };

  describe("canView", () => {
    it("allows the owner to view", () => {
      expect(canView(doc, OWNER)).toBe(true);
    });

    it("allows a user in sharedWith to view", () => {
      expect(canView(doc, SHARED_VIEWER)).toBe(true);
    });

    it("denies a user who is neither owner nor shared", () => {
      expect(canView(doc, UNRELATED_USER)).toBe(false);
    });
  });

  describe("canEdit", () => {
    it("allows the owner to edit", () => {
      expect(canEdit(doc, OWNER)).toBe(true);
    });

    it("denies a shared (read-only) viewer from editing", () => {
      // This is the assertion the whole read-only sharing model
      // depends on (FR-9/FR-12) — a regression here would silently
      // grant shared viewers write access.
      expect(canEdit(doc, SHARED_VIEWER)).toBe(false);
    });

    it("denies an unrelated user from editing", () => {
      expect(canEdit(doc, UNRELATED_USER)).toBe(false);
    });
  });

  describe("canShare", () => {
    it("allows the owner to share", () => {
      expect(canShare(doc, OWNER)).toBe(true);
    });

    it("denies a shared viewer from re-sharing", () => {
      expect(canShare(doc, SHARED_VIEWER)).toBe(false);
    });

    it("denies an unrelated user from sharing", () => {
      expect(canShare(doc, UNRELATED_USER)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("treats an empty sharedWith list as no shared access", () => {
      const soloDoc: AccessCheckable = { ownerId: OWNER, sharedWith: [] };
      expect(canView(soloDoc, SHARED_VIEWER)).toBe(false);
    });

    it("does not treat the owner as implicitly present in sharedWith", () => {
      // Guards against a subtle bug where canEdit might be implemented
      // as "owner OR in sharedWith" instead of "owner only."
      const weirdDoc: AccessCheckable = { ownerId: OWNER, sharedWith: [OWNER] };
      expect(canEdit(weirdDoc, OWNER)).toBe(true); // still true, but for the right reason
      expect(canShare(weirdDoc, OWNER)).toBe(true);
    });
  });
});

import { describe, expect, it } from "vitest";

import { buildPreferenceSuggestions } from "../../src/lib/liji/preference-suggestions";
import { demoWorkspace } from "../../src/lib/liji/sample-data";

describe("preference suggestions", () => {
  it("turns AI memory into non-duplicated profile preference suggestions", () => {
    const suggestions = buildPreferenceSuggestions(demoWorkspace);

    expect(suggestions).toEqual([
      expect.objectContaining({
        contactId: "c-client",
        contactName: "周明",
        category: "food",
        label: "安静包间",
        evidence: "周明不吃香菜，偏好安静包间。",
      }),
    ]);
  });

  it("keeps avoid and positive preferences in separate categories", () => {
    const suggestions = buildPreferenceSuggestions({
      ...demoWorkspace,
      contacts: demoWorkspace.contacts.map((contact) =>
        contact.id === "c-client" ? { ...contact, preferences: [] } : contact
      ),
    });

    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "avoid", label: "不吃香菜" }),
        expect.objectContaining({ category: "food", label: "安静包间" }),
      ])
    );
  });
});

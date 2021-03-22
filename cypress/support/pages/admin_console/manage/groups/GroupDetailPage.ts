const expect = chai.expect;

export default class GroupDetailPage {
  private groupNamesColumn = '[data-label="Group name"] > a';
  private memberTab = "members";
  private attributesTab = "attributes";
  private memberNameColumn = 'tbody > tr > [data-label="Name"]';
  private includeSubGroupsCheck = "includeSubGroupsCheck";
  private addMembers = "addMember";
  private addMember = "add";
  private memberUsernameColumn = 'tbody > tr > [data-label="Username"]';

  private keyInput = '[name="attributes[0].key"]';
  private valueInput = '[name="attributes[0].value"]';
  private saveAttributeBtn = ".pf-c-form__actions > .pf-m-primary";

  checkListSubGroup(subGroups: string[]) {
    cy.get(this.groupNamesColumn).should((groups) => {
      expect(groups).to.have.length(subGroups.length);
      for (let index = 0; index < subGroups.length; index++) {
        const subGroup = subGroups[index];
        expect(groups).to.contain(subGroup);
      }
    });
    return this;
  }

  clickMembersTab() {
    cy.getId(this.memberTab).click();
    return this;
  }

  checkListMembers(members: string[]) {
    cy.get(this.memberNameColumn).should((member) => {
      expect(member).to.have.length(members.length);
      for (let index = 0; index < members.length; index++) {
        expect(member.eq(index)).to.contain(members[index]);
      }
    });
    return this;
  }

  checkSelectableMembers(members: string[]) {
    cy.get(this.memberUsernameColumn).should((member) => {
      for (const user of members) {
        expect(member).to.contain(user);
      }
    });
    return this;
  }

  selectUsers(users: string[]) {
    for (const user of users) {
      cy.get(this.memberUsernameColumn)
        .contains(user)
        .parent()
        .find("input")
        .click();
    }
    return this;
  }

  clickAdd() {
    cy.getId(this.addMember).click();
    return this;
  }

  clickIncludeSubGroups() {
    cy.getId(this.includeSubGroupsCheck).click();
    return this;
  }

  clickAttributesTab() {
    cy.getId(this.attributesTab).click();
    return this;
  }

  clickAddMembers() {
    cy.getId(this.addMembers).click();
    return this;
  }

  fillAttribute(key: string, value: string) {
    cy.get(this.keyInput).type(key).get(this.valueInput).type(value);
    return this;
  }

  saveAttribute() {
    cy.get(this.saveAttributeBtn).click();
    return this;
  }
}

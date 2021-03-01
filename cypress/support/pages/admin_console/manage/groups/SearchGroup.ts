/// <reference types="../../../.." />
export class SearchGroupPage {
  private searchField = "group-search";
  private searchButton = "search-button";

  searchGroup(search: string) {
    cy.getBy(this.searchField).type(search);
    return this;
  }

  clickSearchButton() {
    cy.getBy(this.searchButton).click();
    return this;
  }

  checkTerm(searchTerm: string) {
    cy.get(".pf-c-chip-group").children().contains(searchTerm).should("exist");
    return this;
  }
}

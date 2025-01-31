describe('The Home Page', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('successfully loads', () => {
    cy.verifyFullHeader()
    cy.verifyHomePage()
  })
})

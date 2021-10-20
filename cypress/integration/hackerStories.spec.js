describe('Hacker Stories', () => {
  const initialTerm = 'React'
  const newTerm = 'Cypress'

  context('hitting the real API', () => {
    beforeEach(() => {
      cy.intercept({
        method: 'GET',
        pathname: '**/search',
        query: {
          query: initialTerm,
          page: '0'
        }
      }).as('getStories')

      cy.visit('/')
      cy.wait('@getStories')

      cy.intercept(
        'GET',
        `**/search?query=${newTerm}&page=0`
      ).as('getNewTermStories')
    })

    it('shows 20 stories, then the next 20 after clicking "More"', () => {
      cy.intercept({
        method: 'GET',
        pathname: '**/search',
        query: {
          query: initialTerm,
          page: '1'
        }
      }).as('getNextStories')

      cy.get('.item').should('be.visible')
        .and('have.length', 20)

      cy.contains('More')
        .should('be.visible')
        .click()
      cy.wait('@getNextStories')

      cy.get('.item').should('be.visible')
        .and('have.length', 40)
    })

    it('searches via the last searched term', () => {
      cy.get('#search').should('be.visible')
        .clear()
        .type(`${newTerm}{enter}`)

      cy.wait('@getNewTermStories')

      cy.get(`button:contains(${initialTerm})`)
        .should('be.visible')
        .click()

      cy.wait('@getStories')

      cy.get('.item').should('be.visible')
        .and('have.length', 20)
      cy.get('.item')
        .first()
        .should('contain', initialTerm)
      cy.get(`button:contains(${newTerm})`)
        .should('be.visible')
    })
  })

  context('mocking the API', () => {
    context('footer and list of stories', () => {
      beforeEach(() => {
        cy.intercept(
          'GET',
          `**/search?query=${initialTerm}&page=0`,
          { fixture: 'stories' }
        ).as('getStories')

        cy.visit('/')
        cy.wait('@getStories')
      })
      it('shows the footer', () => {
        cy.get('footer')
          .should('be.visible')
          .and('contain', 'Icons made by Freepik from www.flaticon.com')
      })

      context('List of stories', () => {
        it('shows the right data for all rendered stories', () => {
          const stories = require('../fixtures/stories')
          cy.get('.item').should('be.visible')
            .eq(0)
            .should('contain', stories.hits[0].title)
            .and('contain', stories.hits[0].author)
            .and('contain', stories.hits[0].num_comments)
          cy.get(`.item a:contains(${stories.hits[0].title})`)
            .should('have.attr', 'href', stories.hits[0].url)

          cy.get('.item').should('be.visible')
            .eq(1)
            .should('contain', stories.hits[1].title)
            .and('contain', stories.hits[1].author)
            .and('contain', stories.hits[1].num_comments)
          cy.get(`.item a:contains(${stories.hits[1].title})`)
            .should('have.attr', 'href', stories.hits[1].url)
        })

        it('shows the less one story after dimissing the first one', () => {
          cy.get('.button-small').should('be.visible')
            .first()
            .click()
          cy.get('.item').should('be.visible')
            .and('have.length', 1)
        })
      })

      context('Order by', () => {
        const stories = require('../fixtures/stories')
        it('orders by title', () => {
          cy.get('.list-header-button:contains(Title) ')
            .click()

          cy.get('.item')
            .first()
            .should('be.visible')
            .and('contain', stories.hits[0].title)
        })

        it('orders by author', () => {
          cy.get('.list-header-button:contains(Author)')
            .click()

          cy.get('.item')
            .first()
            .should('be.visible')
            .and('contain', stories.hits[0].author)
        })

        it('orders by comments', () => {
          cy.get('.list-header-button:contains(Comments)')
            .click()

          cy.get('.item')
            .first()
            .should('be.visible')
            .and('contain', stories.hits[1].num_comments)
        })

        it('orders by points', () => {
          cy.get('.list-header-button:contains(Points)')
            .click()

          cy.get('.item')
            .first()
            .should('be.visible')
            .and('contain', stories.hits[0].points)
        })
      })
    })

    context('search', () => {
      beforeEach(() => {
        cy.intercept(
          'GET',
          `**/search?query=${initialTerm}&page=0`,
          { fixture: 'empty' }
        ).as('getEmptyStories')

        cy.intercept(
          'GET',
          `**/search?query=${newTerm}&page=0`,
          { fixture: 'stories' }
        ).as('getStories')

        cy.visit('/')
        cy.wait('@getEmptyStories')
      })

      it('shows no story when none is returned', () => {
        cy.get('.button-small').should('not.exist')
      })

      it('types and hits ENTER', () => {
        cy.get('#search').should('be.visible')
          .clear()
          .type(`${newTerm}{enter}`)

        cy.wait('@getStories')

        cy.get('.item').should('be.visible')
          .and('have.length', 2)
        cy.get(`button:contains(${initialTerm})`)
          .should('be.visible')
      })

      it('types and clicks the submit button', () => {
        cy.get('#search').should('be.visible')
          .clear()
          .type(newTerm)
        cy.contains('Submit')
          .click()

        cy.wait('@getStories')

        cy.get('.item').should('have.length', 2)
        cy.get(`button:contains(${initialTerm})`)
          .should('be.visible')
      })

      it('shows a max of 5 buttons for the last searched terms', () => {
        const faker = require('faker')

        cy.intercept(
          'GET',
          '**/search**',
          { fixture: 'empty' }
        ).as('getRandomStories')
        // a busca pelo **/search**, valida qualquer elemento é encontrado
        Cypress._.times(6, () => {
          cy.get('#search')
            .clear()
            .type(`${faker.random.word()}{enter}`)
          cy.wait('@getRandomStories')
        })

        //util quando o seletor solicitado é muito extenso
        cy.get('.last-searches')
          .within(() => {
            cy.get('button')
              .should('have.length', 5)
          })
      })
    })
  })
})

context('Errors', () => {
  it('shows "Something went wrong ..."', () => {
    cy.intercept(
      'GET',
      '**/search**',
      { statusCode: 500 }
    ).as('getServerFailure')

    cy.visit('/')
    cy.wait('@getServerFailure')

    cy.get('p:contains(Something went wrong ...)')
      .should('be.visible')
  })

  it('shows "Something went wrong ..." in case of a network error', () => {
    cy.intercept(
      'GET',
      '**/search**',
      { forceNetworkError: true }
    ).as('getNetworkError')

    cy.visit('/')
    cy.wait('@getNetworkError')

    cy.get('p:contains(Something went wrong ...)')
      .should('be.visible')
  })
})
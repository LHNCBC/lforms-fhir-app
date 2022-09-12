// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// Get one or more DOM elements by element's id where '/' and '.' is escaped
// and "#" is added if not already present.
Cypress.Commands.add(
    'byId',
    { prevSubject: 'optional' },
    (subject, idSelector) => {
        // escape the '/' and the '.' in the id
        const escapedSelector = idSelector.replace(/\//g,"\\/").replace(/\./g,"\\.");
        const cySelector = escapedSelector[0] === "#" ? escapedSelector : "#" + escapedSelector;
        if (subject) {
            return cy.wrap(subject).get(cySelector);
        }
        else {
            return cy.get(cySelector);
        }
    }
);

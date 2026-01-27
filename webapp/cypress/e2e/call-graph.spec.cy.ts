import 'cypress-file-upload';

describe('E2E Call Graph Testing (CR03)', () => {

  const MOCK_DATA = {
      "success": true,
      "data": {
        "directed": true,
        "multigraph": false,
        "nodes": [
          {
            "id": "main.py::entry",
            "label": "entry",
            "full_name": "main.py::entry",
            "type": "FUNCTION",
            "x": 0.5,
            "y": 1,
            "file_path": "main.py",
            "start_line": 1,
            "end_line": 2,
            "source_code": "def entry(): pass",
            "has_smell": false,
            "smell_count": 0,
            "smell_details": []
          },
          {
            "id": "utils.py::helper",
            "label": "helper",
            "full_name": "utils.py::helper",
            "type": "FUNCTION",
            "x": 0.5,
            "y": 0,
            "file_path": "utils.py",
            "start_line": 10,
            "end_line": 12,
            "source_code": "def helper(): pass",
            "has_smell": true,
            "smell_count": 1,
            "smell_details": [
              { "name": "Test Smell", "description": "Desc", "line": 10 }
            ]
          }
        ],
        "edges": [
          { "source": "main.py::entry", "target": "utils.py::helper" }
        ]
      }
  };

  beforeEach(() => {
    // Intercept with proper headers to avoid CORS/preflight issues often seen in Cypress
    cy.intercept('POST', '**/api/generate_call_graph', (req) => {
        req.reply({
            statusCode: 200,
            body: MOCK_DATA,
        });
    }).as('generateGraph');

    cy.visit('http://localhost:3000/call-graph');
  });

  describe('Rendering dell\'interfaccia di upload', () => {
    it('Verifica elementi UI iniziali (Drag & Drop, Input)', () => {
      // Verifica Titolo
      cy.contains('h1', 'Call Graph Visualization').should('be.visible');
      
      // Verifica Area Upload (Drop Zone)
      cy.get('[data-testid="drop-zone"]').should('be.visible')
        .and('contain', 'Upload Python File')
        .and('contain', 'Or drag and drop your file here');

      // Verifica Bottone Select File
      cy.contains('button', 'Select File').should('be.visible');

      // Verifica Bottone Generate disabilitato
      cy.contains('button', 'Generate Graph').should('be.disabled');
    });
  });

  describe('Upload e Visualizzazione del Grafo', () => {
    it('Simulazione upload di un file valido e rendering del grafo', () => {
      const fileName = 'test_project.py';
      const fileContent = 'def entry(): pass';

      // 1. Upload File
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from(fileContent),
        fileName: fileName,
        mimeType: 'text/x-python',
      }, { force: true });

      // Verifica feedback visivo
      cy.contains(`Selected: ${fileName}`).should('be.visible');

      // 2. Click Generate
      cy.contains('button', 'Generate Graph').should('not.be.disabled').click();

      // 3. Verifica API call
      cy.wait('@generateGraph').its('response.statusCode').should('eq', 200);

      // 4. Verifica Rendering Nodi (React Plotly)
      // Nota: Plotly usa elementi SVG text per le annotazioni
      cy.contains('entry').should('be.visible');
      cy.contains('helper').should('be.visible');
    });

    it('Validazione Input (File non valido)', () => {
      // Test Drop di un file .txt
      cy.get('[data-testid="drop-zone"]').selectFile({
        contents: Cypress.Buffer.from('test'),
        fileName: 'invalid.txt',
        mimeType: 'text/plain',
      }, { action: 'drag-drop', force: true });

      // Verifica Toast di errore
      // Toastify shows errors with a specific class or role
      cy.contains('Please upload a valid .py file.').should('be.visible');
      
      // Assicurati che il bottone rimanga disabilitato (nessun file valido selezionato)
      // Nota: se c'era un file selezionato prima, questo potrebbe non resettarlo a meno che la logica non lo gestisca.
      // Assumiamo che il test sia isolato (beforeEach ricarica pag).
      cy.contains('button', 'Generate Graph').should('be.disabled');
    });
  });

  describe('Interazione con i Nodi', () => {
    it('Apertura Modale Dettagli al click sul nodo', () => {
      // Pre-step: Carica e Genera
      const fileName = 'test_project.py';
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('...'),
        fileName: fileName,
        mimeType: 'text/x-python',
      }, { force: true });
      cy.contains('button', 'Generate Graph').click();
      cy.wait('@generateGraph');

      // Interazione: Click sull'annotazione (Box) del nodo "entry"
      // Le annotazioni di Plotly hanno classe 'annotation-text-g' o simili, ma il testo è selezionabile
      cy.contains('entry')
        .click({ force: true }); 
      
      // Asserzione: La modale deve aprirsi
      // Cerchiamo un elemento distintivo della modale, es. "Node: entry"
      cy.contains('Node: entry').should('be.visible');
      cy.contains('main.py::entry').should('be.visible');
      
      // Chiusura Modale via bottone Close
      cy.contains('button', 'Close').click();
    });
  });

  describe('Gestione Errori e Smells', () => {
    it('Visualizzazione Dettagli Smell nel Modal', () => {
       // 1. Upload e Generazione
       const fileName = 'test_project.py';
       cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('def helper(): pass'),
        fileName: fileName,
        mimeType: 'text/x-python',
      }, { force: true });
      cy.contains('button', 'Generate Graph').click();
      // Wait for the alias defined in beforeEach
      cy.wait('@generateGraph');

      // 2. Click sul nodo con smell (helper)
      cy.contains('helper').click({ force: true });

      // 3. Verifica presenza sezione Smells
      cy.contains('Node: helper').should('be.visible');
      cy.contains('Detected Smells (1)').should('be.visible');
      cy.contains('Test Smell').should('be.visible');
      cy.contains('Line: 10').should('be.visible');
      
      // Close modal
      cy.contains('button', 'Close').click();
    });

    it('Verifica Nodo "Pulito" (Nessun Smell)', () => {
      // 1. Upload e Generazione
      const fileName = 'test_project.py';
      cy.get('input[type="file"]').selectFile({
       contents: Cypress.Buffer.from('def entry(): pass'),
       fileName: fileName,
       mimeType: 'text/x-python',
     }, { force: true });
     cy.contains('button', 'Generate Graph').click();
     cy.wait('@generateGraph');

     // 2. Click sul nodo entry (definito come clean nel mock)
     // Usiamo una selezione più specifica se necessario, ma contains('entry') è univoco qui
     cy.contains('entry').click({ force: true });

     // 3. Verifica Feedback Positivo
     cy.contains('Node: entry').should('be.visible');
     cy.contains('Excellent! No smell detected').should('be.visible');
     
     // Verifica che NON ci siano sezioni Smell
     cy.contains('Detected Smells').should('not.exist');
   });

    it('Gestione Errore Server (500)', () => {
      // Override dell'intercept per simulare errore
      cy.intercept('POST', '**/api/generate_call_graph', {
        statusCode: 500,
        body: { error: 'Internal Server Error' }
      }).as('generateGraphError');

      // Upload
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('import error'),
        fileName: 'error.py',
        mimeType: 'text/x-python',
      }, { force: true });

      // Generazione
      cy.contains('button', 'Generate Graph').click();
      cy.wait('@generateGraphError');

      // Verifica Messaggio Errore (Toast)
      // Nota: Fetch non lancia eccezioni su 500, quindi entriamo nel ramo else (data.success false)
      cy.contains('Failed to generate graph').should('be.visible');
    });
  });
});

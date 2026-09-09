export const AI_TEST_PAPER_STYLES = `
            @media print { @page { margin: 2cm; } body { margin: 0; } .page-break { page-break-before: always; } }
            body { font-family: 'Malgun Gothic', sans-serif; max-width: 21cm; margin: 0 auto; padding: 20px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 15px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header .info { margin-top: 10px; font-size: 14px; color: #666; }
            .question { margin-bottom: 25px; padding: 10px 0; border-bottom: 1px dashed #ddd; }
            .q-meta { margin-bottom: 6px; }
            .question-number { font-weight: bold; display: inline-block; min-width: 30px; }
            .q-type { font-size: 11px; background: #eee; padding: 2px 6px; border-radius: 4px; margin-left: 4px; }
            .question-content { font-size: 16px; margin-bottom: 10px; }
            .choices { margin-left: 30px; }
            .choice { margin: 8px 0; font-size: 15px; }
            .choice-marker { display: inline-block; min-width: 30px; font-weight: bold; }
            .answer-section { margin-top: 40px; }
            .answer-section h2, .explanation-section h2 { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333; }
            .answer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
            .answer-item { padding: 8px; background: #f5f5f5; border-radius: 4px; }
            .answer-number { font-weight: bold; margin-right: 8px; }
            .explanation-item { margin-bottom: 14px; padding: 10px; background: #fafafa; border-radius: 6px; border-left: 3px solid #3498db; }
            .exp-answer { font-size: 13px; color: #27ae60; font-weight: bold; margin: 4px 0; }
            .exp-text { font-size: 13px; color: #555; }
          `;

export const TEST_PAPER_STYLES = `
            @media print {
              @page { margin: 2cm; }
              body { margin: 0; }
              .page-break { page-break-before: always; }
            }
            body {
              font-family: 'Malgun Gothic', sans-serif;
              max-width: 21cm;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #333;
              padding-bottom: 15px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .header .info {
              margin-top: 10px;
              font-size: 14px;
              color: #666;
            }
            .question {
              margin-bottom: 25px;
              padding: 10px 0;
              border-bottom: 1px dashed #ddd;
            }
            .question-number {
              font-weight: bold;
              display: inline-block;
              min-width: 40px;
            }
            .question-content {
              display: inline;
              font-size: 16px;
            }
            .choices {
              margin-top: 10px;
              margin-left: 40px;
            }
            .choice {
              margin: 8px 0;
              font-size: 15px;
            }
            .choice-marker {
              display: inline-block;
              min-width: 30px;
              font-weight: bold;
            }
            .answer-blank {
              border-bottom: 1px solid #333;
              display: inline-block;
              min-width: 200px;
              margin-left: 10px;
            }
            .matching-container {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin: 20px 0;
            }
            .matching-column h3 {
              text-align: center;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 2px solid #333;
            }
            .matching-item {
              margin: 12px 0;
              padding: 8px;
              background: #f9f9f9;
              border-radius: 4px;
            }
            .matching-number, .matching-letter {
              font-weight: bold;
              display: inline-block;
              min-width: 30px;
            }
            .matching-blank {
              margin-left: 10px;
              font-weight: bold;
            }
            .answer-section {
              margin-top: 40px;
            }
            .answer-section h2 {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 10px;
              border-bottom: 2px solid #333;
            }
            .answer-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
            }
            .answer-item {
              padding: 8px;
              background: #f5f5f5;
              border-radius: 4px;
            }
            .answer-number {
              font-weight: bold;
              margin-right: 8px;
            }
            .pos {
              color: #666;
              font-size: 12px;
              margin-left: 5px;
            }
          `;

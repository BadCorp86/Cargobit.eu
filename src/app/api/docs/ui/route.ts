/**
 * CargoBit Admin API - Swagger UI
 * 
 * GET /api/docs/ui - Interactive Swagger UI for API documentation
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CargoBit Admin API - Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css">
  <style>
    body { margin: 0; background: #fafafa; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { font-size: 28px; }
    .swagger-ui .scheme-container { 
      background: #fff; 
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 10px 20px;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "/api/docs",
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: "list",
        deepLinking: true,
        requestSnippetsEnabled: true,
        persistAuthorization: true,
        displayOperationId: false,
        filter: true,
        syntaxHighlight: {
          activate: true,
          theme: "monokai"
        }
      });
      
      window.ui = ui;
    };
  </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

#!/bin/bash
echo "==================================================="
echo "  SereneReader - Leitor Ergonomico Web/PWA"
echo "==================================================="
echo "Iniciando servidor local HTTP na porta 8080..."
echo ""

if command -v npx &> /dev/null; then
    (sleep 1 && (xdg-open http://localhost:8080/index.html || open http://localhost:8080/index.html)) &
    npx -y serve -p 8080 .
elif command -v python3 &> /dev/null; then
    (sleep 1 && (xdg-open http://localhost:8080/index.html || open http://localhost:8080/index.html)) &
    python3 -m http.server 8080
else
    echo "Abrindo o ficheiro index.html diretamente no navegador..."
    xdg-open index.html || open index.html
fi

const fs = require('fs');
const crypto = require('crypto');

// Fonction pour générer un jeton aléatoire de 60 caractères
function generateToken() {
    return crypto.randomBytes(30).toString('hex');
}

// Générer une liste de jetons
const tokens = {
    "client1": generateToken(),
    "client2": generateToken(),
    "client3": generateToken(),
    // Ajoutez plus de jetons si nécessaire
};

// Enregistrer les jetons dans un fichier JSON
fs.writeFileSync('authorized_tokens.json', JSON.stringify(tokens, null, 3));
console.log('Tokens enregistrés dans authorized_tokens.json');

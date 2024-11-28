const fs = require('fs');
const WebSocket = require('ws');
const url = require('url');
const { v4: uuidv4 } = require('uuid');

// Charger les jetons autorisés depuis le fichier JSON
const authorizedTokens = JSON.parse(fs.readFileSync('authorized_tokens.json', 'utf8'));

// Stocker les messages en attente de confirmation
let pendingMessages = {};

// Créer le serveur WebSocket
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {
    const parameters = url.parse(req.url, true).query;
    const token = parameters.token;

    // Valider le jeton
    if (!Object.values(authorizedTokens).includes(token)) {
        console.log('Connexion refusée : jeton invalide');
        ws.close(); // Fermer la connexion si le jeton est invalide
        return;
    }

    console.log('Un client est connecté avec un jeton valide');

    // Gestion des messages reçus des clients
    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);

        // Si le message est un ACK, supprimer le message en attente
        if (parsedMessage.type === 'ack' && pendingMessages[parsedMessage.messageId]) {
            console.log(`ACK reçu pour le message ID ${parsedMessage.messageId}`);
            delete pendingMessages[parsedMessage.messageId]; // Supprime le message des en attente
            return;
        }

        // Traiter le message comme un message normal
        const messageId = generateUniqueId();
        pendingMessages[messageId] = { message, attempts: 0 };

        // Diffuser le message aux autres clients
        broadcast(ws, JSON.stringify({ id: messageId, data: parsedMessage }));

        // Réessayer d'envoyer si aucun ACK n'est reçu après un délai, jusqu'à 3 tentatives
        retryMessage(ws, messageId, parsedMessage);
    });

    // Gestion de la déconnexion du client
    ws.on('close', () => {
        console.log('Client déconnecté');
    });
});

// Fonction pour diffuser un message à tous les clients connectés sauf l'émetteur
function broadcast(sender, message) {
    wss.clients.forEach(client => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Fonction pour réessayer l'envoi d'un message non confirmé (jusqu'à 3 fois)
function retryMessage(ws, messageId, parsedMessage) {
    const intervalId = setInterval(() => {
        if (pendingMessages[messageId]) {
            if (pendingMessages[messageId].attempts >= 3) {
                console.log(`Échec d'envoi du message ID ${messageId} après 3 tentatives.`);
                delete pendingMessages[messageId]; // Retirer le message des en attente
                clearInterval(intervalId);
            } else {
                console.log(`Pas d'ACK reçu pour le message ID ${messageId}, réessai...`);
                ws.send(JSON.stringify({ id: messageId, data: parsedMessage }));
                pendingMessages[messageId].attempts += 1;
            }
        } else {
            clearInterval(intervalId); // Stopper le réessai si ACK reçu
        }
    }, 5000); // Réessayer toutes les 5 secondes
}

// Fonction pour générer un identifiant unique pour chaque message
function generateUniqueId() {
    return uuidv4();
}

console.log('Serveur WebSocket en écoute sur le port 8080');

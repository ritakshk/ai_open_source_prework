// Game client for MMORPG
class GameClient {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.worldImage = new Image();
        this.worldWidth = 2048;
        this.worldHeight = 2048;
        
        // Player and game state
        this.myPlayerId = null;
        this.myPlayer = null;
        this.players = {};
        this.avatars = {};
        this.websocket = null;
        
        // Viewport/camera
        this.viewportX = 0;
        this.viewportY = 0;
        
        // Avatar settings
        this.avatarSize = 32;
        
        // Movement state
        this.pressedKeys = new Set();
        this.keyToDirection = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right'
        };
        this.diagonalTimer = null;
        this.isMovingDiagonally = false;
        
        // UI elements
        this.playerCountElement = null;
        
        this.init();
    }
    
    init() {
        // Set canvas size to fill the browser window
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Load the world map image
        this.worldImage.onload = () => {
            this.draw();
        };
        this.worldImage.src = 'world.jpg';
        
        // Connect to game server
        this.connectToServer();
        
        // Add keyboard event listeners
        this.setupKeyboardControls();
        
        // Add mouse event listeners
        this.setupMouseControls();
        
        // Initialize UI
        this.initializeUI();
    }
    
    connectToServer() {
        this.websocket = new WebSocket('wss://codepath-mmorg.onrender.com');
        
        this.websocket.onopen = () => {
            console.log('Connected to game server');
            this.joinGame();
        };
        
        this.websocket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleServerMessage(message);
        };
        
        this.websocket.onclose = () => {
            console.log('Disconnected from game server');
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }
    
    joinGame() {
        const joinMessage = {
            action: 'join_game',
            username: 'Rita'
        };
        
        this.websocket.send(JSON.stringify(joinMessage));
    }
    
    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });
        
        document.addEventListener('keyup', (event) => {
            this.handleKeyUp(event);
        });
    }
    
    handleKeyDown(event) {
        // Only handle arrow keys
        if (!this.keyToDirection.hasOwnProperty(event.code)) return;
        
        // Prevent default browser behavior (scrolling)
        event.preventDefault();
        
        // Add key to pressed keys set
        this.pressedKeys.add(event.code);
        
        // Send move command based on current key combination
        this.sendMovementCommand();
    }
    
    handleKeyUp(event) {
        // Only handle arrow keys
        if (!this.keyToDirection.hasOwnProperty(event.code)) return;
        
        // Remove key from pressed keys set
        this.pressedKeys.delete(event.code);
        
        // If no movement keys are pressed, send stop command
        if (this.pressedKeys.size === 0) {
            this.sendStopCommand();
        } else {
            // Send updated movement command based on remaining keys
            this.sendMovementCommand();
        }
    }
    
    sendMovementCommand() {
        if (this.pressedKeys.size === 0) return;
        
        // Convert pressed keys to directions
        const directions = Array.from(this.pressedKeys).map(key => this.keyToDirection[key]);
        
        // For now, let's just use the first direction pressed
        // This is the most reliable approach
        const direction = directions[0];
        this.sendMoveCommand(direction);
    }
    
    sendClickToMove(x, y) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;
        
        const moveMessage = {
            action: 'move',
            x: Math.max(0, Math.min(x, this.worldWidth)),
            y: Math.max(0, Math.min(y, this.worldHeight))
        };
        
        this.websocket.send(JSON.stringify(moveMessage));
    }
    
    sendMoveCommand(direction) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;
        
        const moveMessage = {
            action: 'move',
            direction: direction
        };
        
        this.websocket.send(JSON.stringify(moveMessage));
    }
    
    sendStopCommand() {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;
        
        const stopMessage = {
            action: 'stop'
        };
        
        this.websocket.send(JSON.stringify(stopMessage));
    }
    
    setupMouseControls() {
        this.canvas.addEventListener('click', (event) => {
            this.handleCanvasClick(event);
        });
    }
    
    handleCanvasClick(event) {
        // Get click position relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        
        // Convert screen coordinates to world coordinates
        const worldX = clickX + this.viewportX;
        const worldY = clickY + this.viewportY;
        
        // Send click-to-move command
        this.sendClickToMove(worldX, worldY);
        
        // Add visual feedback
        this.showClickIndicator(clickX, clickY);
    }
    
    showClickIndicator(screenX, screenY) {
        // Create a temporary visual indicator at click location
        const indicator = document.createElement('div');
        indicator.style.position = 'absolute';
        indicator.style.left = (screenX - 5) + 'px';
        indicator.style.top = (screenY - 5) + 'px';
        indicator.style.width = '10px';
        indicator.style.height = '10px';
        indicator.style.backgroundColor = 'yellow';
        indicator.style.borderRadius = '50%';
        indicator.style.pointerEvents = 'none';
        indicator.style.zIndex = '1000';
        indicator.style.animation = 'fadeOut 1s ease-out forwards';
        
        // Add fade out animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeOut {
                0% { opacity: 1; transform: scale(1); }
                100% { opacity: 0; transform: scale(0.5); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(indicator);
        
        // Remove indicator after animation
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 1000);
    }
    
    initializeUI() {
        this.playerCountElement = document.getElementById('playerCount');
        this.updatePlayerCount();
    }
    
    updatePlayerCount() {
        if (this.playerCountElement) {
            const playerCount = Object.keys(this.players).length;
            this.playerCountElement.textContent = `Players: ${playerCount}`;
        }
    }
    
    handleServerMessage(message) {
        console.log('Received message:', message);
        
        switch (message.action) {
            case 'join_game':
                if (message.success) {
                    this.myPlayerId = message.playerId;
                    this.players = message.players;
                    this.avatars = message.avatars;
                    this.myPlayer = this.players[this.myPlayerId];
                    this.centerViewportOnPlayer();
                    this.updatePlayerCount();
                    this.draw();
                }
                break;
                
            case 'player_joined':
                this.players[message.player.id] = message.player;
                this.avatars[message.avatar.name] = message.avatar;
                this.updatePlayerCount();
                this.draw();
                break;
                
            case 'players_moved':
                Object.assign(this.players, message.players);
                this.draw();
                break;
                
            case 'player_left':
                delete this.players[message.playerId];
                this.updatePlayerCount();
                this.draw();
                break;
        }
    }
    
    centerViewportOnPlayer() {
        if (!this.myPlayer) return;
        
        // Center the viewport on the player
        this.viewportX = this.myPlayer.x - this.canvas.width / 2;
        this.viewportY = this.myPlayer.y - this.canvas.height / 2;
        
        // Constrain viewport to world boundaries
        this.viewportX = Math.max(0, Math.min(this.viewportX, this.worldWidth - this.canvas.width));
        this.viewportY = Math.max(0, Math.min(this.viewportY, this.worldHeight - this.canvas.height));
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.centerViewportOnPlayer();
        this.draw();
    }
    
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.viewportX,
            y: worldY - this.viewportY
        };
    }
    
    isInViewport(worldX, worldY) {
        const screen = this.worldToScreen(worldX, worldY);
        return screen.x >= -this.avatarSize && 
               screen.x <= this.canvas.width + this.avatarSize &&
               screen.y >= -this.avatarSize && 
               screen.y <= this.canvas.height + this.avatarSize;
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw the world map
        this.ctx.drawImage(
            this.worldImage,
            this.viewportX, this.viewportY, // source x, y (viewport offset)
            this.canvas.width, this.canvas.height, // source width, height (viewport size)
            0, 0, // destination x, y (canvas origin)
            this.canvas.width, this.canvas.height // destination width, height (canvas size)
        );
        
        // Draw all players
        this.drawPlayers();
    }
    
    drawPlayers() {
        Object.values(this.players).forEach(player => {
            if (!this.isInViewport(player.x, player.y)) return;
            
            const screenPos = this.worldToScreen(player.x, player.y);
            this.drawAvatar(player, screenPos.x, screenPos.y);
            this.drawPlayerName(player, screenPos.x, screenPos.y);
        });
    }
    
    drawAvatar(player, screenX, screenY) {
        const avatar = this.avatars[player.avatar];
        if (!avatar) return;
        
        const frames = avatar.frames[player.facing];
        if (!frames || !frames[player.animationFrame]) return;
        
        const img = new Image();
        img.onload = () => {
            // Calculate aspect ratio to maintain proper proportions
            const aspectRatio = img.width / img.height;
            const width = this.avatarSize;
            const height = this.avatarSize / aspectRatio;
            
            // Center the avatar on the player position
            const x = screenX - width / 2;
            const y = screenY - height;
            
            // Handle west direction (flip east frames)
            if (player.facing === 'west') {
                this.ctx.save();
                this.ctx.scale(-1, 1);
                this.ctx.drawImage(img, -x - width, y, width, height);
                this.ctx.restore();
            } else {
                this.ctx.drawImage(img, x, y, width, height);
            }
        };
        img.src = frames[player.animationFrame];
    }
    
    drawPlayerName(player, screenX, screenY) {
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 2;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        
        const textY = screenY - this.avatarSize - 5;
        
        // Draw text with outline
        this.ctx.strokeText(player.username, screenX, textY);
        this.ctx.fillText(player.username, screenX, textY);
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GameClient();
});

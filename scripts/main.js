// Composant pour porte interactive avec téléportation
AFRAME.registerComponent('door-interactive', {
    schema: {
        linkedDoor: {type: 'selector'},
        teleportPos: {type: 'vec3', default: {x: 0, y: 1.6, z: 0}},
        teleportRot: {type: 'vec3', default: {x: 0, y: 0, z: 0}}
    },
    
    init: function() {
        this.isOpen = false;
        this.isAnimating = false;
        this.canTeleport = true;
        const el = this.el;
        const data = this.data;
        
        // Écouter les clics sur les éléments cliquables de la porte
        el.querySelectorAll('.clickable').forEach(clickable => {
            clickable.addEventListener('click', () => {
                if (this.isAnimating) return;
                this.toggleDoor();
            });
        });
    },
    
    tick: function() {
        if (!this.isOpen || !this.canTeleport) return;
        
        const rig = document.querySelector('#rig');
        const rigPos = rig.getAttribute('position');
        const doorPos = this.el.getAttribute('position');
        
        // Zone de téléportation DEVANT la porte (côté joueur, Z positif par rapport à la porte)
        // La porte est à Z=-2, donc le joueur approche depuis Z > -2
        const dx = rigPos.x - (doorPos.x + 0.45); // Centre de la porte
        const dz = rigPos.z - doorPos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Si le joueur est proche devant la porte ouverte (distance < 1m, et devant la porte)
        if (distance < 1.0 && dz > -0.3 && dz < 0.8) {
            this.teleportPlayer();
        }
    },
    
    toggleDoor: function() {
        this.isAnimating = true;
        const targetRotation = this.isOpen ? '0 0 0' : '0 -100 0';
        
        this.el.setAttribute('animation', {
            property: 'rotation',
            to: targetRotation,
            dur: 800,
            easing: 'easeInOutQuad'
        });
        
        this.isOpen = !this.isOpen;
        
        setTimeout(() => {
            this.isAnimating = false;
            this.el.removeAttribute('animation');
        }, 850);
        
        console.log(this.isOpen ? 'Porte ouverte' : 'Porte fermée');
    },
    
    openDoor: function() {
        if (this.isOpen || this.isAnimating) return;
        this.toggleDoor();
    },
    
    teleportPlayer: function() {
        const rig = document.querySelector('#rig');
        const camera = rig.querySelector('[camera]');
        const data = this.data;
        const linkedDoor = data.linkedDoor;
        
        if (!linkedDoor) return;
        
        // Désactiver la téléportation temporairement pour éviter les boucles
        this.canTeleport = false;
        const linkedComponent = linkedDoor.components['door-interactive'];
        if (linkedComponent) {
            linkedComponent.canTeleport = false;
        }
        
        // Ouvrir l'autre porte si elle est fermée
        if (linkedComponent && !linkedComponent.isOpen) {
            linkedComponent.openDoor();
        }
        
        // Téléporter le joueur
        rig.setAttribute('position', data.teleportPos);
        
        // Rotation du rig de 180° pour regarder vers la porte
        const currentRigRot = rig.getAttribute('rotation');
        rig.setAttribute('rotation', {x: currentRigRot.x, y: currentRigRot.y + 180, z: currentRigRot.z});
        
        console.log('Téléportation vers l\'autre porte!');
        
        // Réactiver la téléportation de cette porte rapidement
        setTimeout(() => {
            this.canTeleport = true;
        }, 1000);
        
        // Réactiver la téléportation de la porte d'arrivée après 6 secondes
        if (linkedComponent) {
            setTimeout(() => {
                linkedComponent.canTeleport = true;
            }, 4000);
        }
    }
});

// Composant pour cadre pivotant (révèle le coffre-fort)
AFRAME.registerComponent('swing-frame', {
    init: function() {
        this.isOpen = false;
        this.isAnimating = false;
        const el = this.el;
        
        // Écouter les clics sur le cadre
        el.querySelectorAll('.clickable').forEach(clickable => {
            clickable.addEventListener('click', () => {
                if (this.isAnimating) return;
                this.toggleFrame();
            });
        });
    },
    
    toggleFrame: function() {
        this.isAnimating = true;
        // Pivoter sur le côté gauche (comme une porte)
        const targetRotation = this.isOpen ? '0 0 0' : '0 0 -110';
        
        this.el.setAttribute('animation', {
            property: 'rotation',
            to: targetRotation,
            dur: 600,
            easing: 'easeInOutQuad'
        });
        
        this.isOpen = !this.isOpen;
        
        setTimeout(() => {
            this.isAnimating = false;
            this.el.removeAttribute('animation');
        }, 650);
        
        console.log(this.isOpen ? 'Cadre ouvert - Coffre-fort révélé!' : 'Cadre fermé');
    }
});

// Composant pour le clavier du coffre-fort
AFRAME.registerComponent('safe-keypad', {
    init: function() {
        this.code = '';
        this.correctCode = '528491'; // Code par défaut
        this.isUnlocked = false;
        this.display = document.querySelector('#safe-display');
        
        // Écouter les clics sur les touches
        document.querySelectorAll('.safe-key').forEach(key => {
            key.addEventListener('click', (e) => {
                const keyValue = key.getAttribute('data-key');
                this.handleKeyPress(keyValue, key);
            });
        });
    },
    
    handleKeyPress: function(key, keyEl) {
        if (this.isUnlocked) return;
        
        // Animation de la touche
        const originalColor = keyEl.getAttribute('material').color;
        keyEl.setAttribute('material', 'color', '#666666');
        setTimeout(() => {
            keyEl.setAttribute('material', 'color', originalColor);
        }, 100);
        
        if (key === 'C') {
            // Effacer le code
            this.code = '';
            this.updateDisplay();
            console.log('Code effacé');
        } else if (key === 'OK') {
            // Vérifier le code
            this.checkCode();
        } else {
            // Ajouter un chiffre (max 6)
            if (this.code.length < 6) {
                this.code += key;
                this.updateDisplay();
                console.log('Code entré:', this.code);
            }
        }
    },
    
    updateDisplay: function() {
        if (this.display) {
            // Afficher les chiffres entrés avec des tirets pour les positions vides
            let displayText = '';
            for (let i = 0; i < 6; i++) {
                displayText += this.code[i] || '-';
            }
            this.display.setAttribute('value', displayText);
        }
    },
    
    checkCode: function() {
        if (this.code === this.correctCode) {
            this.isUnlocked = true;
            if (this.display) {
                this.display.setAttribute('value', 'OPEN');
                this.display.setAttribute('color', '#00FF00');
            }
            console.log('Coffre-fort déverrouillé!');
            
            // Lancer la musique
            const musicPlayer = document.querySelector('#music-player');
            if (musicPlayer && musicPlayer.components.sound) {
                musicPlayer.components.sound.playSound();
                console.log('Musique lancée - Code trouvé!');
            }
            
            // BASCULEMENT CONTINU STYLE INCEPTION - Rotation infinie
            const rig = document.querySelector('#rig');
            const camera = document.querySelector('#camera-entity');
            
            // Démarrer l'animation pré-définie en HTML (compatible VR)
            if (camera && camera.components['animation__inception']) {
                camera.components['animation__inception'].beginAnimation();
            }
            
            console.log('La pièce bascule !');
            
            // ========== TRANSITION VERS L'AVION ==========
            // Éléments de l'hôtel à faire disparaître (sauf les aiguilles)
            const hotelElements = [
                '#door-frame', '#door-pivot-A', '#door-pivot-B',
                '#mur-gauche', '#mur-droite-gauche', '#mur-droite-droite',
                '#mur-escalier-fond', '#mur-escalier-droite', '#mur-escalier-gauche',
                '#mur-derriere', '#mur-fond','#escalier-hotel','#plafond-hotel','#plafond-escalier',
                '#lustre-central', '#lustre-gauche', '#lustre-droite',
                '#table-toupie', '#safe-container', '#cadre-federer-pivot', '#moquette-hotel'
            ];
            
            // Faire disparaître les éléments de l'hôtel progressivement
            let delay = 3000;
            hotelElements.forEach((selector, index) => {
                setTimeout(() => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        if (el) {
                            el.setAttribute('animation__fade', {
                                property: 'visible',
                                to: false,
                                dur: 1,
                                delay: 500
                            });
                            // Faire un fade en réduisant l'échelle
                            el.setAttribute('animation__scale', {
                                property: 'scale',
                                to: '0 0 0',
                                dur: 1000,
                                easing: 'easeInQuad'
                            });
                            setTimeout(() => {
                                el.setAttribute('visible', false);
                            }, 1000);
                        }
                    });
                }, delay + (index * 300));
            });
            
            
            // Faire apparaître l'avion après la disparition de l'hôtel
            setTimeout(() => {
                const avion = document.querySelector('#avion-container');
                if (avion) {
                    avion.setAttribute('visible', true);
                    avion.setAttribute('scale', '0.01 0.01 0.01');
                    avion.setAttribute('animation__appear', {
                        property: 'scale',
                        to: '1 1 1',
                        dur: 3000,
                        easing: 'easeOutQuad'
                    });
                    console.log('Bienvenue dans l\'avion!');
                }
            }, delay + 6000);
            
            // Arrêter la rotation et stabiliser la caméra après la transition
            setTimeout(() => {
                // Arrêter l'animation Inception
                if (camera && camera.components['animation__inception']) {
                    camera.components['animation__inception'].pauseAnimation();
                }
                camera.setAttribute('rotation', '0 0 0');
                // Orienter le rig vers les aiguilles (direction X positif = 90°)
                const hauteurAvion = MODE_DEV_HAUTEUR ? 1.6 : 0.1;
                
                rig.setAttribute('rotation', '0 -90 0');
                rig.setAttribute('position', `-1.6 ${hauteurAvion} 0`);
                console.log('Rotation arrêtée - Vous pouvez explorer l\'avion!');
            }, delay + 9000);
            
        } else {
            if (this.display) {
                this.display.setAttribute('value', 'ERR!');
                this.display.setAttribute('color', '#FF0000');
            }
            console.log('Code incorrect!');
            // Reset après 1 seconde
            setTimeout(() => {
                this.code = '';
                if (this.display) {
                    this.display.setAttribute('value', '------');
                    this.display.setAttribute('color', '#00BFFF');
                }
            }, 1000);
        }
    }
});

// Système de collision personnalisé pour empêcher de sortir du cube
AFRAME.registerComponent('boundary-collision', {
    tick: function() {
        const position = this.el.getAttribute('position');
        
        // Limites du cube 4m × 4m × 4m avec marge
        const margin = 0.3;
        const minX = -2 + margin;
        const maxX = 2 - margin;
        const minY = 0.1;
        const maxY = 4 - margin;
        const minZ = -2 + margin;
        const maxZ = 2 - margin;
        
        // Contraindre la position
        if (position.x < minX) position.x = minX;
        if (position.x > maxX) position.x = maxX;
        if (position.y < minY) position.y = minY;
        if (position.y > maxY) position.y = maxY;
        if (position.z < minZ) position.z = minZ;
        if (position.z > maxZ) position.z = maxZ;
        
        this.el.setAttribute('position', position);
    }
});

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', function() {
    // ========== MODE DÉVELOPPEMENT - HAUTEUR CAMÉRA ==========
    // true = Mode PC (1.6m de hauteur), false = Mode VR (0.1m de hauteur)
    const MODE_DEV_HAUTEUR = true;
    
    // Appliquer la hauteur selon le mode
    const rig = document.querySelector('#rig');
    if (rig && MODE_DEV_HAUTEUR) {
        const pos = rig.getAttribute('position');
        rig.setAttribute('position', {x: pos.x, y: 1.6, z: pos.z});
        console.log('🖥️ MODE DEV: Caméra à 1.6m de hauteur (PC)');
    } else {
        console.log('🥽 MODE VR: Caméra à 0.1m de hauteur (VR)');
    }
    
    // ========== FONCTION TEMPORAIRE - MODE DÉVELOPPEMENT AVION ==========
    // Décommenter la ligne ci-dessous pour afficher directement l'avion
    // activerModeAvion();
    
    // ========== POPUP D'INSTRUCTION ==========
    // Faire disparaître le popup après 8 secondes
    setTimeout(() => {
        const popup = document.querySelector('#popup-instruction');
        if (popup) {
            popup.setAttribute('animation', {
                property: 'scale',
                to: '0 0 0',
                dur: 300,
                easing: 'easeInQuad'
            });
            setTimeout(() => {
                popup.setAttribute('visible', false);
            }, 300);
        }
    }, 8000);
    
    
    function activerModeAvion() {
        console.log('🛩️ MODE DÉVELOPPEMENT AVION ACTIVÉ');
        
        // Cacher immédiatement tous les éléments de l'hôtel
        const hotelElements = [
            '#door-frame', '#door-pivot-A', '#door-pivot-B',
            '#mur-gauche', '#mur-droite-gauche', '#mur-droite-droite',
            '#mur-escalier-fond', '#mur-escalier-droite', '#mur-escalier-gauche',
            '#mur-derriere', '#mur-fond',
            '#lustre-central', '#lustre-gauche', '#lustre-droite',
            '#table-toupie', '#safe-container', '#cadre-federer-pivot',
            '#escalier-hotel'
        ];
        
        hotelElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el) el.setAttribute('visible', false);
            });
        });
        
        // Cacher les sols et plafonds de l'hôtel
        const sol = document.querySelector('a-plane[position="0 0 0"]');
        const plafond = document.querySelector('a-plane[position="0 4 0"]');
        const plafondEscalier = document.querySelector('a-plane[position="0 17 4"]');
        const escalier = document.querySelector('#escalier-hotel');
        if (sol) sol.setAttribute('visible', false);
        if (plafond) plafond.setAttribute('visible', false);
        if (plafondEscalier) plafondEscalier.setAttribute('visible', false);
        if (escalier) escalier.setAttribute('visible', false);
        
        // Afficher l'avion immédiatement
        const avion = document.querySelector('#avion-container');
        if (avion) {
            avion.setAttribute('visible', true);
        }
        
        // Positionner la caméra dans l'avion avec hauteur selon le mode
        const rig = document.querySelector('#rig');
        const hauteur = MODE_DEV_HAUTEUR ? 1.6 : 0.1;
        if (rig) {
            rig.setAttribute('position', `-1.6 ${hauteur} 0`);
            rig.setAttribute('rotation', '0 -90 0'); 
        }
        
        console.log('✅ Vous êtes maintenant dans l\'avion');
    }
    // ========== FIN MODE DÉVELOPPEMENT ==========
    
    // Appliquer le composant de collision au rig
    document.querySelector('#rig').setAttribute('boundary-collision', '');

    console.log('Cube 4m × 4m × 4m initialisé');
    console.log('Utilisez WASD ou les flèches pour vous déplacer');
    console.log('Les collisions empêchent de sortir du cube');

    // Animation des aiguilles de l'horloge - Désormais gérée en HTML via animations A-Frame
    // (Commenté car les animations sont maintenant dans index.html pour compatibilité VR)
    /*
    (function() {
        const pivotMinutes = document.querySelector('#pivot-minutes');
        const pivotHeures = document.querySelector('#pivot-heures');
        
        let minuteAngle = 0;
        let heureAngle = 0;
        
        // Vitesse : 1 tour de la grande aiguille = 3 secondes (rapide mais visible)
        const vitesseMinutes = 360 / 3; // degrés par seconde (1 tour en 3s)
        const vitesseHeures = vitesseMinutes / 12; // 12x plus lent
        
        let lastTime = performance.now();
        
        function animerAiguilles() {
            const now = performance.now();
            const deltaTime = (now - lastTime) / 1000; // en secondes
            lastTime = now;
            
            // Rotation des aiguilles (sens horaire = angles négatifs)
            minuteAngle -= vitesseMinutes * deltaTime;
            heureAngle -= vitesseHeures * deltaTime;
            
            // Appliquer les rotations (rotation autour de l'axe X car l'horloge est sur le mur)
            if (pivotMinutes) {
                pivotMinutes.setAttribute('rotation', {x: -minuteAngle, y: 0, z: 0});
            }
            if (pivotHeures) {
                pivotHeures.setAttribute('rotation', {x: -heureAngle, y: 0, z: 0});
            }
            
            requestAnimationFrame(animerAiguilles);
        }
        
        // Démarrer l'animation
        animerAiguilles();
        console.log('Horloge démarrée - Grande aiguille: 1 tour/3s, Petite aiguille: 1 tour/36s');
    })();
    */
    console.log('⏰ Horloge animée en HTML - Grande aiguille: 1 tour/3s, Petite aiguille: 1 tour/36s');

    // Initialiser le clavier du coffre-fort
    (function() {
        const safeContainer = document.querySelector('#safe-container');
        if (safeContainer) {
            // Créer une entité virtuelle pour le composant safe-keypad
            const safeController = document.createElement('a-entity');
            safeController.setAttribute('safe-keypad', '');
            document.querySelector('a-scene').appendChild(safeController);
            console.log('Coffre-fort initialisé - Code par défaut: 528491');
        }
    })();
});

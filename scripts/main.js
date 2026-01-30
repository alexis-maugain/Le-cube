// Composant pour désactiver le curseur desktop en mode VR
AFRAME.registerComponent('desktop-only-cursor', {
    init: function() {
        const el = this.el;
        const sceneEl = this.el.sceneEl;
        
        // Désactiver le curseur quand on entre en VR
        sceneEl.addEventListener('enter-vr', () => {
            el.setAttribute('visible', false);
            el.setAttribute('raycaster', 'enabled', false);
        });
        
        // Réactiver le curseur quand on sort de VR
        sceneEl.addEventListener('exit-vr', () => {
            el.setAttribute('visible', true);
            el.setAttribute('raycaster', 'enabled', true);
        });
    }
});

// Composant pour démarrer le son de l'horloge automatiquement
AFRAME.registerComponent('clock-sound', {
    init: function() {
        const el = this.el;
        const sceneEl = el.sceneEl;
        
        // Attendre que la scène soit complètement chargée
        if (sceneEl.hasLoaded) {
            this.startSound();
        } else {
            sceneEl.addEventListener('loaded', () => {
                this.startSound();
            });
        }
    },
    
    startSound: function() {
        const soundComponent = this.el.components.sound;
        if (soundComponent) {
            // Démarrer le son après un petit délai
            setTimeout(() => {
                soundComponent.playSound();
                console.log('Son de l\'horloge démarré');
            }, 0);
        }
    }
});

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
        
        // Jouer le son approprié
        const soundEntity = document.createElement('a-entity');
        if (this.isOpen) {
            // Fermeture de la porte
            soundEntity.setAttribute('sound', {
                src: '#porte-close',
                autoplay: true,
                volume: 0.6
            });
        } else {
            // Ouverture de la porte
            soundEntity.setAttribute('sound', {
                src: '#porte-open',
                autoplay: true,
                volume: 0.6
            });
        }
        this.el.sceneEl.appendChild(soundEntity);
        setTimeout(() => {
            this.el.sceneEl.removeChild(soundEntity);
        }, 2000);
        
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
        
        // Récupérer MODE_DEV_HAUTEUR depuis window ou utiliser la hauteur actuelle du rig
        const currentHeight = rig.getAttribute('position').y;
        const teleportPos = data.teleportPos;
        
        // Téléporter le joueur en conservant la hauteur actuelle
        rig.setAttribute('position', {
            x: teleportPos.x,
            y: currentHeight,  // Utiliser la hauteur actuelle au lieu de celle codée en dur
            z: teleportPos.z
        });
        
        // Rotation du rig de 180° pour regarder vers la porte
        const currentRigRot = rig.getAttribute('rotation');
        rig.setAttribute('rotation', {x: currentRigRot.x, y: currentRigRot.y + 180, z: currentRigRot.z});
        
        console.log('Téléportation vers l\'autre porte!');
        
        // Détecter si on arrive dans l'avion en vérifiant si l'avion est visible
        setTimeout(() => {
            const avionContainer = document.querySelector('#avion-container');
            if (avionContainer && avionContainer.getAttribute('visible') === true) {
                console.log('Arrivée dans l\'avion - l\'hôtesse parlera dans 5 secondes...');
                setTimeout(() => {
                    const hotesseSound = document.createElement('a-entity');
                    hotesseSound.setAttribute('sound', {
                        src: '#hotesse-audio',
                        autoplay: true,
                        volume: 1
                    });
                    this.el.sceneEl.appendChild(hotesseSound);
                    setTimeout(() => {
                        try {
                            this.el.sceneEl.removeChild(hotesseSound);
                        } catch(e) {}
                    }, 15000);
                    console.log('Hôtesse: Annonce de l\'atterrissage');
                }, 5000);
            }
        }, 100);
        
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
        
        // Jouer le son du cadre
        const soundEntity = document.createElement('a-entity');
        soundEntity.setAttribute('sound', {
            src: '#cadre-audio',
            autoplay: true,
            volume: 0.6
        });
        document.querySelector('a-scene').appendChild(soundEntity);
        setTimeout(() => {
            try {
                document.querySelector('a-scene').removeChild(soundEntity);
            } catch(e) {}
        }, 2000);
        
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
        
        // Jouer le son bip
        this.playSound('safe-bip');
        
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
            
            // Jouer le son de succès
            this.playSound('safe-success');
            
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
            
            // Démarrer l'animation pré-définie en HTML sur le rig (compatible VR)
            if (rig && rig.components['animation__inception']) {
                rig.components['animation__inception'].beginAnimation();
            }
            
            // ACCÉLÉRER LES AIGUILLES DE L'HORLOGE
            const pivotHeures = document.querySelector('#pivot-heures');
            const pivotMinutes = document.querySelector('#pivot-minutes');
            if (pivotHeures) {
                pivotHeures.setAttribute('animation', 'property: rotation; to: -360 0 0; dur: 3600; easing: linear; loop: true');
                console.log('Aiguille des heures accélérée (10x)');
            }
            if (pivotMinutes) {
                pivotMinutes.setAttribute('animation', 'property: rotation; to: -360 0 0; dur: 300; easing: linear; loop: true');
                console.log('Aiguille des minutes accélérée (10x)');
            }
            
            // ACCÉLÉRER LE SON DE L'HORLOGE
            const horlogeSound = document.querySelector('#horloge-hotel');
            if (horlogeSound && horlogeSound.components.sound) {
                horlogeSound.setAttribute('sound', 'volume', 0.6);
                horlogeSound.setAttribute('sound', 'playbackRate', 40);
                console.log('Son de l\'horloge accéléré (10x)');
            }
            
            console.log('La pièce bascule !');
            
            // ========== TRANSITION VERS L'AVION ==========
            // Éléments de l'hôtel à faire disparaître (sauf les aiguilles)
            const hotelElements = [
                '#door-frame', '#door-pivot-A', '#door-pivot-B', '#lustre-central', '#lustre-gauche', '#lustre-droite',
                '#table-toupie', '#magazine-secret', '#safe-container', '#cadre-federer-pivot', '#escalier-hotel',
                '#moquette-hotel', '#mur-escalier-fond', '#mur-escalier-droite', '#mur-droite-droite', '#mur-gauche', '#mur-escalier-gauche',
                '#mur-derriere', '#mur-fond','#plafond-hotel','#plafond-escalier', '#mur-droite-gauche', 
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
                    
                    // ARRÊTER LE SON DE L'HORLOGE
                    const horlogeSound = document.querySelector('#horloge-hotel');
                    if (horlogeSound && horlogeSound.components.sound) {
                        horlogeSound.components.sound.stopSound();
                        console.log('Son de l\'horloge arrêté dans l\'avion');
                    }
                    
                    // Déclencher le son de l'hôtesse 5 secondes après l'apparition de l'avion
                    setTimeout(() => {
                        console.log('Arrivée dans l\'avion - l\'hôtesse va parler...');
                        const hotesseSound = document.createElement('a-entity');
                        hotesseSound.setAttribute('sound', {
                            src: '#hotesse-audio',
                            autoplay: true,
                            volume: 0.8
                        });
                        document.querySelector('a-scene').appendChild(hotesseSound);
                        setTimeout(() => {
                            try {
                                document.querySelector('a-scene').removeChild(hotesseSound);
                            } catch(e) {}
                        }, 15000);
                        console.log('Hôtesse: Annonce de l\'atterrissage');
                    }, 5000);
                }
            }, delay + 6000);
            
            // Arrêter la rotation et stabiliser la caméra après la transition
            setTimeout(() => {
                // Arrêter l'animation Inception sur le rig
                if (rig && rig.components['animation__inception']) {
                    rig.components['animation__inception'].pauseAnimation();
                }
                
                // RALENTIR LES AIGUILLES DE L'HORLOGE (retour à vitesse normale)
                const pivotHeures = document.querySelector('#pivot-heures');
                const pivotMinutes = document.querySelector('#pivot-minutes');
                if (pivotHeures) {
                    pivotHeures.setAttribute('animation', 'property: rotation; to: -360 0 0; dur: 36000; easing: linear; loop: true');
                    console.log('Aiguille des heures ralentie (vitesse normale)');
                }
                if (pivotMinutes) {
                    pivotMinutes.setAttribute('animation', 'property: rotation; to: -360 0 0; dur: 3000; easing: linear; loop: true');
                    console.log('Aiguille des minutes ralentie (vitesse normale)');
                }
                
                // Orienter le rig vers les aiguilles (direction X positif = 90°)
                const hauteurAvion = window.MODE_DEV_HAUTEUR ? 1.6 : 0.1;
                
                rig.setAttribute('rotation', '0 -90 0');
                rig.setAttribute('position', `-1.6 ${hauteurAvion} 0`);
                console.log('Rotation arrêtée - Vous pouvez explorer l\'avion!');
            }, delay + 9000);
            
        } else {
            // Code incorrect
            // Jouer le son d'erreur
            this.playSound('safe-error');
            
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
    },
    
    playSound: function(soundId) {
        const soundEntity = document.createElement('a-entity');
        soundEntity.setAttribute('sound', {
            src: '#' + soundId,
            autoplay: true,
            volume: 0.8
        });
        this.el.sceneEl.appendChild(soundEntity);
        setTimeout(() => {
            try {
                this.el.sceneEl.removeChild(soundEntity);
            } catch(e) {}
        }, 2000);
    }
});

// Système de collision personnalisé pour empêcher de sortir du cube
AFRAME.registerComponent('boundary-collision', {
    tick: function() {
        const position = this.el.getAttribute('position');
        
        // Marges adaptées selon le mode (VR nécessite plus d'espace pour éviter de voir à travers les murs)
        const isVRMode = !window.MODE_DEV_HAUTEUR; // VR = false, PC = true
        const margin = isVRMode ? 0.5 : 0.3; // Marge plus importante en VR
        
        // Limites du cube 4m × 4m × 4m avec marge
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
    // Détection automatique du mode VR
    let MODE_DEV_HAUTEUR = true; // Par défaut en mode PC
    
    const scene = document.querySelector('a-scene');
    const rig = document.querySelector('#rig');
    
    // Fonction pour ajuster la hauteur selon le mode
    function ajusterHauteur(estModePC) {
        if (rig) {
            const pos = rig.getAttribute('position');
            const nouvelleHauteur = estModePC ? 1.6 : 0.1;
            rig.setAttribute('position', {x: pos.x, y: nouvelleHauteur, z: pos.z});
            console.log(estModePC ? '🖥️ MODE PC: Caméra à 1.6m de hauteur' : '🥽 MODE VR: Caméra à 0.1m de hauteur');
        }
    }
    
    // Appliquer la hauteur initiale (mode PC par défaut)
    ajusterHauteur(MODE_DEV_HAUTEUR);
    
    // Gérer la visibilité du curseur desktop
    const desktopCursor = document.querySelector('#desktop-cursor');
    
    // Écouter l'entrée en mode VR
    if (scene) {
        scene.addEventListener('enter-vr', function() {
            MODE_DEV_HAUTEUR = false;
            window.MODE_DEV_HAUTEUR = false; // Mettre à jour aussi la variable globale
            ajusterHauteur(false);
            // Cacher le curseur desktop en VR
            if (desktopCursor) {
                desktopCursor.setAttribute('visible', false);
            }
        });
        
        // Écouter la sortie du mode VR
        scene.addEventListener('exit-vr', function() {
            MODE_DEV_HAUTEUR = true;
            window.MODE_DEV_HAUTEUR = true; // Mettre à jour aussi la variable globale
            ajusterHauteur(true);
            // Réafficher le curseur desktop hors VR
            if (desktopCursor) {
                desktopCursor.setAttribute('visible', true);
            }
        });
    }
    
    // Rendre MODE_DEV_HAUTEUR accessible globalement
    window.MODE_DEV_HAUTEUR = MODE_DEV_HAUTEUR;
    
    // ========== FONCTION TEMPORAIRE - MODE DÉVELOPPEMENT AVION ==========
    // Décommenter la ligne ci-dessous pour afficher directement l'avion
    // activerModeAvion(); 
    
    
    function activerModeAvion() {
        console.log('🛩️ MODE DÉVELOPPEMENT AVION ACTIVÉ');
        
        // Cacher immédiatement tous les éléments de l'hôtel
        const hotelElements = [
            '#door-frame', '#door-pivot-A', '#door-pivot-B',
            '#mur-gauche', '#mur-droite-gauche', '#mur-droite-droite',
            '#mur-escalier-fond', '#mur-escalier-droite', '#mur-escalier-gauche',
            '#mur-derriere', '#mur-fond',
            '#lustre-central', '#lustre-gauche', '#lustre-droite',
            '#table-toupie', '#magazine-secret', '#safe-container', '#cadre-federer-pivot',
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
        const hauteur = window.MODE_DEV_HAUTEUR ? 1.6 : 0.1;
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

    // Interaction avec la radio - Play/Pause
    (function() {
        const radioEntity = document.querySelector('#radio-entity');
        const radioSound = document.querySelector('#radio-sound');
        let isPlaying = false;

        if (radioEntity && radioSound) {
            radioEntity.addEventListener('click', function() {
                if (!isPlaying) {
                    radioSound.components.sound.playSound();
                    console.log('Radio: Musique lancée');
                    isPlaying = true;
                } else {
                    radioSound.components.sound.pauseSound();
                    console.log('Radio: Musique en pause');
                    isPlaying = false;
                }
            });
            console.log('Radio interactive initialisée');
        }
    })();
});

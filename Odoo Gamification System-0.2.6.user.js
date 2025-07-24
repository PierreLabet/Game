// ==UserScript==
// @name         Odoo Gamification System
// @namespace    http://tampermonkey.net/
// @version      0.2.6
// @description  Add gamification system to Odoo helpdesk with custom rank logos
// @author       Alexis.Sair
// @match        https://wspharma.odoo.com/*
// @grant        GM_xmlhttpRequest
// @updateURL    https://github.com/PierreLabet/Game/blob/main/Odoo%20Gamification%20System-0.2.6.user.js
// @downloadURL  https://github.com/PierreLabet/Game/blob/main/Odoo%20Gamification%20System-0.2.6.user.js
// ==/UserScript==

(function() {
  'use strict';

  function loadScript(url, callback){
      var script = document.createElement("script");
      script.type = "text/javascript";
      script.onload = callback;
      script.src = url;
      document.head.appendChild(script);
  }

  loadScript("https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js", function() {
      loadScript("https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js", function() {
          mainGamification();
      });
  });

  function mainGamification() {
      console.log('[Gamification] mainGamification appelée, firebase =', typeof firebase);
      const firebaseConfig = {
          apiKey: "AIzaSyB6OFosv9Fg6pMQv0QGxyanuOETtNCw",
          authDomain: "odooranked.firebaseapp.com",
          databaseURL: "https://odooranked-default-rtdb.europe-west1.firebasedatabase.app",
          projectId: "odooranked",
          storageBucket: "odooranked.appspot.com",
          messagingSenderId: "463495344412",
          appId: "1:463495344412:web:3eace838263aa8124ad49",
          measurementId: "G-HZHTVQT1H8"
      };
      if (firebase.apps.length === 0) {
          firebase.initializeApp(firebaseConfig);
      }
      const database = firebase.database();

      // Fonction utilitaire pour formater et colorer les chiffres dans les tableaux de stats
      function formatStatNumber(val, type) {
          let color = '#3498db'; // Normal (bleu)
          if (type === 'important') color = '#27ae60'; // vert
          if (type === 'urgent') color = '#ff9800'; // orange
          if (type === 'bloquant') color = '#e74c3c'; // rouge
          const style = `font-size:1.25em;font-weight:bold;${val > 0 ? `color:${color};` : 'color:#eee;'}text-align:center;`;
          return `<span style='${style}'>${val}</span>`;
      }

      // Fonction utilitaire pour colorer le type d'appel
      function formatTypeLabel(type) {
          if (type === 'important') return `<span style='color:#27ae60;font-weight:bold;'>Important</span>`;
          if (type === 'urgent') return `<span style='color:#ff9800;font-weight:bold;'>Urgent</span>`;
          if (type === 'bloquant') return `<span style='color:#e74c3c;font-weight:bold;'>Bloquant</span>`;
          return `<span style='color:#3498db;font-weight:bold;'>Normal</span>`;
      }

      // Main ranks and sub-ranks
      const mainRanks = [
          { name: "Novice", xpRequired: 0 },
          { name: "Bronze", xpRequired: 1000 },
          { name: "Argent", xpRequired: 2500 },
          { name: "Or", xpRequired: 5000 },
          { name: "Platine", xpRequired: 10000 },
          { name: "Diamant", xpRequired: 20000 },
          { name: "Maître des appels", xpRequired: 35000 },
          { name: "DIEU DES APPELS", xpRequired: 50000 }
      ];
      const subRankLabels = ["IV", "III", "II", "I"];
      let ranks = [{ name: "Novice", xpRequired: 0 }];
      for (let i = 1; i < mainRanks.length - 1; i++) { // -1 to exclude DIEU DES APPELS from subranks
          const prev = mainRanks[i - 1];
          const curr = mainRanks[i];
          const step = (curr.xpRequired - prev.xpRequired) / 4;
          for (let j = 0; j < 4; j++) {
              ranks.push({
                  name: `${curr.name} ${subRankLabels[j]}`,
                  xpRequired: Math.round(prev.xpRequired + step * (j + 1))
              });
          }
      }
      ranks.push({ name: "DIEU DES APPELS", xpRequired: 50000 });

      // Mapping logos for each main rank
      const rankLogos = {
          "Novice": "https://i.imgur.com/ii2aCGm.png",
          "Bronze": "https://i.imgur.com/JOe5kWu.png",
          "Argent": "https://i.imgur.com/raOPNIg.png",
          "Or": "https://i.imgur.com/meGXyT4.png",
          "Platine": "https://i.imgur.com/7iLbCL8.png",
          "Diamant": "https://i.imgur.com/dANpcmc.png",
          "Maître": "https://i.imgur.com/lsKNORI.png",
          "DIEU": "https://i.imgur.com/jqJIdVW.png"
      };
      const rankColors = {
          "Novice": "#e0e0e0",
          "Bronze": "#cd7f32",
          "Argent": "#bfc1c2",
          "Or": "#e6b800",
          "Platine": "#7ed6df",
          "Diamant": "#273c75",
          "Maître": "#a020f0",
          "DIEU": "#d90429"
      };
      function getRankBaseName(rankName) {
          if (rankName.startsWith("Maître")) return "Maître";
          if (rankName.startsWith("DIEU")) return "DIEU";
          return rankName.split(" ")[0];
      }
      function getCurrentRank(xp) {
          for (let i = ranks.length - 1; i >= 0; i--) {
              if (xp >= ranks[i].xpRequired) {
                  return ranks[i];
              }
          }
          return ranks[0];
      }
      function getNextRankXp(currentXp) {
          const currentRank = getCurrentRank(currentXp);
          const nextRankIndex = ranks.findIndex(rank => rank.xpRequired > currentXp);
          if (nextRankIndex === -1) return null;
          return ranks[nextRankIndex].xpRequired - currentXp;
      }
      function getContrastYIQ(hexcolor) {
          hexcolor = hexcolor.replace('#', '');
          var r = parseInt(hexcolor.substr(0,2),16);
          var g = parseInt(hexcolor.substr(2,2),16);
          var b = parseInt(hexcolor.substr(4,2),16);
          var yiq = ((r*299)+(g*587)+(b*114))/1000;
          return (yiq >= 128) ? '#222' : '#fff';
      }
      function hexToRgba(hex, alpha) {
          hex = hex.replace('#', '');
          let r = parseInt(hex.substring(0,2), 16);
          let g = parseInt(hex.substring(2,4), 16);
          let b = parseInt(hex.substring(4,6), 16);
          return `rgba(${r},${g},${b},${alpha})`;
      }
      function getRankGlowFilter(baseRank, size = 'normal') {
          if (baseRank === 'Platine') return size === 'big' ? 'drop-shadow(0 0 0px #7ed6dfcc) drop-shadow(0 0 14px #7ed6dfcc) drop-shadow(0 0 24px #7ed6df77)' : 'drop-shadow(0 0 0px #7ed6df88) drop-shadow(0 0 7px #7ed6df88) drop-shadow(0 0 12px #7ed6df44)';
          if (baseRank === 'Or') return size === 'big' ? 'drop-shadow(0 0 0px #e6b800cc) drop-shadow(0 0 14px #e6b800cc) drop-shadow(0 0 24px #e6b80077)' : 'drop-shadow(0 0 0px #e6b80088) drop-shadow(0 0 7px #e6b80088) drop-shadow(0 0 12px #e6b80044)';
          if (baseRank === 'Argent') return size === 'big' ? 'drop-shadow(0 0 0px #bfc1c2cc) drop-shadow(0 0 14px #bfc1c2cc) drop-shadow(0 0 24px #bfc1c277)' : 'drop-shadow(0 0 0px #bfc1c288) drop-shadow(0 0 7px #bfc1c288) drop-shadow(0 0 12px #bfc1c244)';
          if (baseRank === 'Bronze') return size === 'big' ? 'drop-shadow(0 0 0px #cd7f32cc) drop-shadow(0 0 14px #cd7f32cc) drop-shadow(0 0 24px #cd7f3277)' : 'drop-shadow(0 0 0px #cd7f3288) drop-shadow(0 0 7px #cd7f3288) drop-shadow(0 0 12px #cd7f3244)';
          if (baseRank === 'Diamant') return size === 'big' ? 'drop-shadow(0 0 0px #273c75cc) drop-shadow(0 0 14px #273c75cc) drop-shadow(0 0 24px #273c7577)' : 'drop-shadow(0 0 0px #273c7588) drop-shadow(0 0 7px #273c7588) drop-shadow(0 0 12px #273c7544)';
          if (baseRank === 'Maître') return size === 'big' ? 'drop-shadow(0 0 0px #a020f0cc) drop-shadow(0 0 14px #a020f0cc) drop-shadow(0 0 24px #a020f077)' : 'drop-shadow(0 0 0px #a020f088) drop-shadow(0 0 7px #a020f088) drop-shadow(0 0 12px #a020f044)';
          if (baseRank === 'DIEU') return size === 'big' ? 'drop-shadow(0 0 0px #d90429cc) drop-shadow(0 0 14px #d90429cc) drop-shadow(0 0 24px #d9042977)' : 'drop-shadow(0 0 0px #d9042988) drop-shadow(0 0 7px #d9042988) drop-shadow(0 0 12px #d9042944)';
          return size === 'big' ? 'drop-shadow(0 0 0px #e0e0e0cc) drop-shadow(0 0 14px #e0e0e0cc) drop-shadow(0 0 24px #e0e0e077)' : 'drop-shadow(0 0 0px #e0e0e088) drop-shadow(0 0 7px #e0e0e088) drop-shadow(0 0 12px #e0e0e044)';
      }
      function updateUI(userData) {
          // Badge flottant : paramètres globaux pour éviter ReferenceError
          const badgeSize = 80;
          const logoSize = 60;
          const stroke = 6;
          const radius = badgeSize/2 - stroke/2 - 1; // 1px de marge entre logo et cercle
          const normalizedRadius = radius;
          const circumference = 2 * Math.PI * normalizedRadius;
          const currentRank = getCurrentRank(userData.xp);
          const nextRankXp = getNextRankXp(userData.xp);
          let progressCircle = 1;
          if (nextRankXp !== null) {
              progressCircle = (userData.xp - currentRank.xpRequired) / (nextRankXp + userData.xp - currentRank.xpRequired);
          }
          let gamificationUI = document.getElementById('gamification-ui');
          const baseRank = getRankBaseName(currentRank.name);
          const logo = rankLogos[baseRank];
          const color = rankColors[baseRank];
          const bgColor = color;
          const textColor = getContrastYIQ(color.replace('#',''));
          if (!gamificationUI) {
              gamificationUI = document.createElement('div');
              gamificationUI.id = 'gamification-ui';
              document.body.appendChild(gamificationUI);
          }
          gamificationUI.style.cssText = `
              position: fixed;
              top: 32px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(34,40,49,0.93);
              color: #f3f6fa;
              padding: 18px 24px 24px 24px;
              border-radius: 18px;
              box-shadow: 0 0 48px 12px ${bgColor}, 0 8px 32px rgba(0,0,0,0.18);
              z-index: 9999;
              min-width: 220px;
              font-family: 'Segoe UI', Arial, sans-serif;
              transition: box-shadow 0.3s, width 0.3s, min-width 0.3s, background 0.5s, color 0.5s;
              display: flex;
              flex-direction: column;
              align-items: center;
              animation: glowing 2s infinite alternate;
              margin-left: 1.8cm;
          `;
          gamificationUI.style.display = 'none';
          let controls = `
              <div style="position:absolute;top:8px;right:8px;display:flex;gap:6px;">
                  <button id="close-btn" title="Fermer" style="background:none;border:none;font-size:2em;cursor:pointer;color:#ff3b3b;">×</button>
              </div>
          `;
          let panelContent = `
                  <div style="display:flex;flex-direction:column;align-items:center;gap:2px;margin-bottom:8px;">
                  <div style="padding:0;display:flex;align-items:center;justify-content:center;background:transparent;border-radius:0;">
                      <img src="${logo}" alt="Logo Rang" style="width:110px;height:110px;object-fit:contain;border-radius:0;background:transparent;filter:${getRankGlowFilter(baseRank)};"/>
                      </div>
                  <div style="font-size:1.1em;font-weight:bold;margin-top:2px;color:#f3f6fa;text-shadow:0 0 8px #fff,0 0 16px ${color};">${currentRank.name}</div>
                  </div>
              ${nextRankXp ? `<div style="font-size:1.18em;font-weight:bold;color:#f3f6fa;text-align:center;margin-bottom:10px;text-shadow:0 1px 8px #fff,0 0 2px #0002;">
<span style='color:#26e0ce;font-size:1.22em;'>${nextRankXp} XP</span> avant <b style='color:#f3f6fa;'>${ranks[ranks.findIndex(r => r.name === currentRank.name)+1]?.name || ""}</b>
</div>` : ''}
                  <div style="margin:14px 0 0 0;width:100%;">
                      <div style="background:#e5e5e5;border-radius:8px;height:14px;overflow:hidden;">
                          <div style="background:#4caf50;height:100%;width:${Math.round(progressCircle*100)}%;transition:width 0.5s;"></div>
                      </div>
                  </div>
              `;
          gamificationUI.innerHTML = controls + panelContent;
          // --- Notification de level up : une seule fois ---
          const userName = getCurrentUserName();
          const storageKey = `gamif_last_rank_${userName}`;
          const lastRank = localStorage.getItem(storageKey);
          if (lastRank && lastRank !== currentRank.name) {
              showRankChangeAnimation(
                  { name: lastRank },
                  currentRank,
                  rankLogos,
                  rankColors
              );
          }
          localStorage.setItem(storageKey, currentRank.name);
          gamificationUI.dataset.rank = currentRank.name;
          document.getElementById('close-btn').onclick = () => {
              gamificationUI.style.display = "none";
              openBtn.style.display = 'flex';
          };
          // Affichage conditionnel du badge flottant selon l'URL (DYNAMIQUE)
          const url = window.location.href;
          const isTicketList = url.includes('model=helpdesk.ticket') && url.includes('view_type=list');
          const isTicketForm = url.includes('model=helpdesk.ticket') && url.includes('view_type=form');
          let openBtn = document.getElementById('open-gamification-btn');
          if (!(isTicketList || isTicketForm)) {
              if (openBtn) openBtn.style.display = 'none';
              gamificationUI.style.display = 'none';
              return;
          }
          if (!openBtn) {
              openBtn = document.createElement('button');
              openBtn.id = 'open-gamification-btn';
              openBtn.innerHTML = `
                <svg width="${badgeSize}" height="${badgeSize}" style="position:absolute;top:0;left:0;z-index:1;" viewBox="0 0 ${badgeSize} ${badgeSize}">
                  <defs>
                    <linearGradient id="xp-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#f953c6"/>
                      <stop offset="60%" stop-color="#b91d73"/>
                      <stop offset="100%" stop-color="#6a11cb"/>
                    </linearGradient>
                  </defs>
                  <circle cx="${badgeSize/2}" cy="${badgeSize/2}" r="${normalizedRadius}" stroke="url(#xp-gradient)" stroke-width="${stroke}"
                    fill="none" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference - progressCircle * circumference}"
                    style="transition:stroke-dashoffset 0.5s;" stroke-linecap="round"/>
                </svg>
                <img src="${logo}" alt="Logo Rang" style="width:${logoSize}px;height:${logoSize}px;object-fit:contain;border-radius:50%;background:#fff;position:relative;z-index:2;filter:${getRankGlowFilter(baseRank)};margin:${(badgeSize-logoSize)/2}px;"/>
              `;
              openBtn.title = 'Afficher le score';
              openBtn.style.cssText = `
                  position: fixed;
                  top: 0px;
                  left: calc(50% - 160px);
                  transform: translateX(-50%);
                  z-index: 9998;
                  font-size: 2em;
                  background: transparent;
                  border: none;
                  border-radius: 50%;
                  width: ${badgeSize}px;
                  height: ${badgeSize}px;
          display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: none;
              `;
              openBtn.onclick = () => {
                  let gamificationUI = document.getElementById('gamification-ui');
                  if (gamificationUI) gamificationUI.style.display = '';
                  openBtn.style.display = 'none';
              };
              document.body.appendChild(openBtn);
          } else {
              openBtn.innerHTML = `
                <svg width="${badgeSize}" height="${badgeSize}" style="position:absolute;top:0;left:0;z-index:1;" viewBox="0 0 ${badgeSize} ${badgeSize}">
                  <defs>
                    <linearGradient id="xp-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#f953c6"/>
                      <stop offset="60%" stop-color="#b91d73"/>
                      <stop offset="100%" stop-color="#6a11cb"/>
                    </linearGradient>
                  </defs>
                  <circle cx="${badgeSize/2}" cy="${badgeSize/2}" r="${normalizedRadius}" stroke="url(#xp-gradient)" stroke-width="${stroke}"
                    fill="none" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference - progressCircle * circumference}"
                    style="transition:stroke-dashoffset 0.5s;" stroke-linecap="round"/>
                </svg>
                <img src="${logo}" alt="Logo Rang" style="width:${logoSize}px;height:${logoSize}px;object-fit:contain;border-radius:50%;background:#fff;position:relative;z-index:2;filter:${getRankGlowFilter(baseRank)};margin:${(badgeSize-logoSize)/2}px;"/>
              `;
              openBtn.style.top = '0px';
              openBtn.style.left = 'calc(50% - 160px)';
              openBtn.style.display = 'flex';
          }
      }
      function showRankChangeAnimation(oldRank, newRank, rankLogos, rankColors) {
          let oldNotif = document.getElementById('rank-change-notif');
          if (oldNotif) oldNotif.remove();
          const notif = document.createElement('div');
          notif.id = 'rank-change-notif';
          const baseOld = getRankBaseName(oldRank.name);
          const baseNew = getRankBaseName(newRank.name);
          const bgColor = rankColors[baseNew];
          const textColor = getContrastYIQ(bgColor.replace('#',''));
          const logoOld = rankLogos[baseOld];
          const logoNew = rankLogos[baseNew];
          notif.style.cssText = `
              --glow-color: ${bgColor};
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              z-index: 10001;
              background: rgba(34,40,49,0.93);
              color: #f3f6fa;
              border-radius: 28px;
              box-shadow: 0 0 0 0 ${bgColor}, 0 8px 32px rgba(0,0,0,0.18);
              padding: 56px 80px 48px 80px;
              font-family: 'Segoe UI', Arial, sans-serif;
              text-align: center;
              font-size: 2em;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 32px;
              animation: fadeInNotif 0.3s, glowingNotif 2.2s infinite alternate;
              border: 3px solid ${bgColor};
              transition: background 0.5s, color 0.5s, box-shadow 0.5s;
          `;
          notif.innerHTML = `
              <div style="font-size:1.2em;font-weight:bold;margin-bottom:10px;color:#f3f6fa;text-shadow:0 0 8px #fff,0 0 16px ${bgColor};letter-spacing:1px;">🎉 Félicitations !</div>
              <div style="font-size:1.1em;margin-bottom:18px;color:#f3f6fa;">Passage à un rang supérieur</div>
              <div style="position:relative;width:100%;height:110px;display:flex;align-items:center;justify-content:center;">
                  <div id="old-rank" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);opacity:1;transition:opacity 0.7s, transform 0.7s cubic-bezier(.4,1.4,.6,1);display:flex;flex-direction:column;align-items:center;gap:2px;">
                      <div style="padding:0;display:flex;align-items:center;justify-content:center;background:transparent;border-radius:0;">
                          <img src="${logoOld}" alt="Logo Rang" style="width:120px;height:120px;object-fit:contain;filter:${getRankGlowFilter(baseOld, 'big')};border-radius:0;background:transparent;"/>
                      </div>
                      <span style="color:#f3f6fa;font-weight:bold;font-size:1.1em;text-shadow:0 0 8px #fff,0 0 16px ${bgColor};">${oldRank.name}</span>
                  </div>
                  <div id="new-rank" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) translateX(80px) scale(0.5);opacity:0;transition:opacity 0.7s, transform 0.7s cubic-bezier(.4,1.4,.6,1);display:flex;flex-direction:column;align-items:center;gap:2px;">
                      <div style="padding:0;display:flex;align-items:center;justify-content:center;background:transparent;border-radius:0;">
                          <img src="${logoNew}" alt="Logo Rang" style="width:120px;height:120px;object-fit:contain;filter:${getRankGlowFilter(baseNew, 'big')};border-radius:0;background:transparent;"/>
                      </div>
                      <span style="color:#f3f6fa;font-weight:bold;font-size:1.1em;text-shadow:0 0 8px #fff,0 0 16px ${bgColor};">${newRank.name}</span>
                  </div>
              </div>
          `;
          document.body.appendChild(notif);
          setTimeout(() => {
              const oldRankDiv = notif.querySelector('#old-rank');
              const newRankDiv = notif.querySelector('#new-rank');
              oldRankDiv.style.opacity = '0';
              oldRankDiv.style.transform = 'translate(-50%,-50%) translateX(-80px) scale(0.7)';
              setTimeout(() => {
                  newRankDiv.style.opacity = '1';
                  newRankDiv.style.transform = 'translate(-50%,-50%) translateX(0) scale(1.15)';
                  notif.style.boxShadow = `0 0 120px 40px ${bgColor}, 0 8px 32px rgba(0,0,0,0.18)`;
                  setTimeout(() => {
                      newRankDiv.style.transform = 'translate(-50%,-50%) translateX(0) scale(1)';
                      setTimeout(() => {
                          notif.style.opacity = '0';
                          notif.style.transform = 'translate(-50%,-40%) scale(0.95)';
                          setTimeout(() => {
                              notif.remove();
                          }, 400);
                      }, 1400);
                  }, 600);
              }, 700);
          }, 400);
      }
      function addPodiumButton() {
          if (document.getElementById('podium-btn')) return;

          function tryAddButton() {
              // Chercher le bouton Analyse dans la navbar
              const analyseBtn = document.querySelector('.o_menu_sections .dropdown-toggle[title="Analyse"]');
              if (!analyseBtn) {
                  setTimeout(tryAddButton, 1000);
                  return;
              }

              // Vérifie si on est bien sur une page ticket (liste ou fiche)
              const url = window.location.href;
              const isTicketList = url.includes('model=helpdesk.ticket') && url.includes('view_type=list');
              const isTicketForm = url.includes('model=helpdesk.ticket') && url.includes('view_type=form');
              if (!(isTicketList || isTicketForm)) {
                  // Si le bouton existe déjà, le masquer
                  const podiumBtn = document.getElementById('podium-btn');
                  if (podiumBtn) podiumBtn.style.display = 'none';
                  const badgesBtn = document.getElementById('badges-btn');
                  if (badgesBtn) badgesBtn.style.display = 'none';
                  return;
              }

              // Cloner le bouton Analyse pour garder le style Odoo
              const btn = analyseBtn.cloneNode(true);
          btn.id = 'podium-btn';
          btn.title = 'Voir le classement';
          btn.setAttribute('data-section', 'classement');
          btn.innerHTML = '<span>🏆 Classement</span>';
          btn.onclick = (e) => {
              e.stopPropagation();
              showClassementMenu(btn);
          };

              // Insérer juste après Analyse
              analyseBtn.parentElement.insertAdjacentElement('afterend', btn);
          }

          tryAddButton();
      }
      function showClassementMenu(anchorBtn) {
          // Supprime tout menu existant
          let oldMenu = document.getElementById('classement-dropdown-menu');
          if (oldMenu) oldMenu.remove();
          // Crée le menu déroulant
          const menu = document.createElement('div');
          menu.id = 'classement-dropdown-menu';
          const menuWidth = 240;
          menu.style.cssText = `
              position: fixed;
              min-width: ${menuWidth}px;
              max-width: 98vw;
              background: #23272f;
              color: #fff;
              border-radius: 14px;
              box-shadow: 0 8px 32px 0 #26e0ce55, 0 2px 8px #0008;
              z-index: 10010;
              font-family: 'Segoe UI', Arial, sans-serif;
              padding: 0.5em 0;
              border: none;
              transition: transform 0.18s cubic-bezier(.4,1.4,.6,1);
              transform: scale(0.98);
          `;
          menu.innerHTML = `
              <div style="padding:12px 24px;cursor:pointer;font-size:1.1em;transition:background 0.2s;" onmouseover="this.style.background='#2226'" onmouseout="this.style.background='none'" id="menu-classement-general">🏆 Classement général</div>
              <div style="padding:12px 24px;cursor:pointer;font-size:1.1em;transition:background 0.2s;" onmouseover="this.style.background='#2226'" onmouseout="this.style.background='none'" id="menu-stats-personnelles">📊 Stats personnelles</div>
              <div style="padding:12px 24px;cursor:pointer;font-size:1.1em;transition:background 0.2s;" onmouseover="this.style.background='#2226'" onmouseout="this.style.background='none'" id="menu-stats-autres">👥 Stats des autres utilisateurs</div>
          `;
          document.body.appendChild(menu);
          // Positionne le menu centré sous le bouton
          const rect = anchorBtn.getBoundingClientRect();
          menu.style.left = (rect.left + rect.width/2 - menuWidth/2 + window.scrollX) + 'px';
          menu.style.top = (rect.bottom + window.scrollY + 8) + 'px';
          // Petit effet scale à l'ouverture
          setTimeout(() => {
              menu.style.transform = 'scale(1)';
          }, 10);
          // Ferme le menu si on clique ailleurs
          setTimeout(() => {
              document.addEventListener('click', closeMenuOnClick, { once: true });
          }, 10);
          function closeMenuOnClick(e) {
              if (!menu.contains(e.target)) menu.remove();
          }
          // Actions des choix
          menu.querySelector('#menu-classement-general').onclick = () => {
              menu.remove();
              showPodiumPopup();
          };
          menu.querySelector('#menu-stats-personnelles').onclick = () => {
              menu.remove();
              showStatsPopup('me');
          };
          menu.querySelector('#menu-stats-autres').onclick = () => {
              menu.remove();
              showStatsPopup('others');
          };
          // Ajout effet glowing sur hover pour chaque option du menu
          const menuOptions = menu.querySelectorAll('div[id^="menu-"]');
          menuOptions.forEach(opt => {
              opt.addEventListener('mouseover', function() {
                  this.style.background = '#23272f';
                  this.style.boxShadow = '0 0 12px 2px #26e0ce, 0 2px 8px #0006';
                  this.style.color = '#26e0ce';
              });
              opt.addEventListener('mouseout', function() {
                  this.style.background = 'none';
                  this.style.boxShadow = 'none';
                  this.style.color = '#fff';
              });
          });
      }
      function showStatsPopup(mode) {
          // Supprime tout popup existant
          let old = document.getElementById('stats-popup');
          if (old) old.remove();
          let oldBg = document.getElementById('stats-bg');
          if (oldBg) oldBg.remove();
          const bg = document.createElement('div');
          bg.id = 'stats-bg';
          bg.style.cssText = `
              position: fixed;
              top: 0; left: 0; right: 0; bottom: 0;
              background: rgba(0,0,0,0.35);
              z-index: 9999;
              animation: fadeInBg 0.3s;
          `;
          document.body.appendChild(bg);
          const popup = document.createElement('div');
          popup.id = 'stats-popup';
          popup.style.cssText = `
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(34,40,49,0.93);
              color: #f3f6fa;
              border-radius: 18px;
              box-shadow: 0 0 32px 8px #26e0ce, 0 8px 32px rgba(0,0,0,0.18);
              z-index: 10000;
              min-width: 700px;
              max-width: 99vw;
              padding: 64px 80px 48px 80px;
              font-family: 'Segoe UI', Arial, sans-serif;
          text-align: center;
              animation: popupIn 0.3s;
              backdrop-filter: blur(6px);
              border: 2px solid #26e0ce44;
          `;
          let title = mode === 'me' ? '📊 Mes statistiques' : '👥 Statistiques des autres utilisateurs';
          popup.innerHTML = `
              <div style="font-size:2.2em;margin-bottom:18px;font-weight:bold;letter-spacing:1px;">${title}</div>
              <div id="stats-content" style="margin-bottom:18px;font-size:1.1em;color:#aaa;">Chargement des stats...</div>
              <button id="close-stats-btn" style="margin-top:22px;padding:9px 28px;border:none;border-radius:8px;background:#4caf50;color:white;font-size:1.1em;cursor:pointer;">Fermer</button>
          `;
          document.body.appendChild(popup);
          document.getElementById('close-stats-btn').onclick = () => {
              popup.remove();
              bg.remove();
          };
          bg.onclick = () => {
              popup.remove();
              bg.remove();
          };
          // --- Affichage des stats ---
          const statsContent = document.getElementById('stats-content');
          if (mode === 'me') {
              // Stats personnelles - refonte
              const userName = getCurrentUserName();
              firebase.database().ref('users/' + encodeURIComponent(userName)).once('value').then(snapshot => {
                  const data = snapshot.val();
                  const xp = data && typeof data.xp === 'number' ? data.xp : 0;
                  const rank = getCurrentRank(xp).name;
                  const logs = data && data.clotures_log ? Object.values(data.clotures_log) : [];
                  let filter = 'jour';
                  let html = `<div style='font-size:1.3em;margin-bottom:12px;'><b style='color:#fff;'>${userName}</b> <span style='font-size:0.95em;font-weight:normal;color:#fff;margin-left:16px;'>— <span style='color:${rankColors[getRankBaseName(rank)]};font-weight:bold;'>${rank}</span> — <span style='color:#26e0ce;font-weight:bold;'>${xp} XP</span></span></div>`;
                  html += `<div style='margin-bottom:18px;'><label for='cloture-filter-me' style='margin-right:8px;'>Filtrer par :</label><select id='cloture-filter-me' style='padding:4px 10px;border-radius:6px;'>` +
                      `<option value='jour'>Jour</option>`+
                      `<option value='semaine'>Semaine</option>`+
                      `<option value='mois'>Mois</option>`+
                      `<option value='annee'>Année</option>`+
                      `<option value='tout'>Tout</option>`+
                      `</select></div>`;
                  html += `<div id='me-summary'></div><div id='me-table'></div>`;
                  statsContent.innerHTML = html;
                  function countTypes(logs) {
                      const types = { normal: 0, important: 0, urgent: 0, bloquant: 0 };
                      logs.forEach(l => { if (types[l.type] !== undefined) types[l.type]++; });
                      return types;
                  }
                  function renderTable(period) {
                      let summary = '';
                      let table = '';
                      if (period === 'jour') {
                          const now = new Date();
                          const today = now.toISOString().slice(0,10);
                          const filtered = logs.filter(l => l.date === today);
                          const types = countTypes(filtered);
                          const total = filtered.length;
                          summary = `<div style='margin-bottom:8px;'><b>Total appels</b> : <span style='color:#4caf50;font-weight:bold;font-size:1.15em;'>${total}</span> | Normal : ${formatStatNumber(types.normal, 'normal')} | Important : ${formatStatNumber(types.important, 'important')} | Urgent : ${formatStatNumber(types.urgent, 'urgent')} | Bloquant : ${formatStatNumber(types.bloquant, 'bloquant')}</div>`;
                          table += `<table style='width:100%;border-collapse:collapse;margin-top:8px;'>`;
                          table += `<thead><tr style='background:#222;'><th style='padding:6px 14px;'>Heure</th><th>Type</th></tr></thead><tbody>`;
                          filtered.sort((a, b) => (b.time||'').localeCompare(a.time||''));
                          filtered.forEach(log => {
                              table += `<tr><td style='padding:6px 14px;'>${log.time || ''}</td><td style='padding:6px 14px;'>${formatTypeLabel(log.type || '')}</td></tr>`;
                          });
                          table += `</tbody></table>`;
                          document.getElementById('me-summary').innerHTML = summary;
                          document.getElementById('me-table').innerHTML = table;
                      } else if (period === 'semaine' || period === 'mois') {
                          let days = [];
                          const now = new Date();
                          if (period === 'semaine') {
                          const weekStart = new Date(now);
                          weekStart.setDate(now.getDate() - now.getDay() + 1); // Lundi
                          for (let i=0; i<7; i++) {
                              const d = new Date(weekStart);
                              d.setDate(weekStart.getDate() + i);
                                  days.push(d.toISOString().slice(0,10));
                              }
                          } else if (period === 'mois') {
                              const ym = now.toISOString().slice(0,7);
                              const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
                              for (let d=1; d<=daysInMonth; d++) {
                                  days.push(ym + '-' + (d<10?'0':'')+d);
                              }
                          }
                          // Résumé total sur la période
                          const periodLogs = logs.filter(l => days.includes(l.date));
                          const types = countTypes(periodLogs);
                          const total = periodLogs.length;
                          summary = `<div style='margin-bottom:8px;'><b>Total appels</b> : <span style='color:#4caf50;font-weight:bold;font-size:1.15em;'>${total}</span> | Normal : ${formatStatNumber(types.normal, 'normal')} | Important : ${formatStatNumber(types.important, 'important')} | Urgent : ${formatStatNumber(types.urgent, 'urgent')} | Bloquant : ${formatStatNumber(types.bloquant, 'bloquant')}</div>`;
                          table += `<table style='width:100%;border-collapse:collapse;margin-top:8px;'>`;
                          table += `<thead><tr style='background:#222;'><th style='padding:6px 14px;'>Date</th><th>Total</th><th>Normal</th><th>Important</th><th>Urgent</th><th>Bloquant</th><th></th></tr></thead><tbody>`;
                          days.forEach((date, dIdx) => {
                              const dayLogs = logs.filter(l => l.date === date);
                              const types = countTypes(dayLogs);
                              const total = dayLogs.length;
                              const dayName = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long' });
                              table += `<tr style='background:${dIdx%2?'#23272f':'#1a1d22'};'>`+
                                  `<td style='padding:6px 14px;'>${dayName} ${date}</td>`+
                                  `<td style='font-weight:bold;color:#4caf50;'>${total}</td>`+
                                  `<td>${formatStatNumber(types.normal, 'normal')}</td>`+
                                  `<td>${formatStatNumber(types.important, 'important')}</td>`+
                                  `<td>${formatStatNumber(types.urgent, 'urgent')}</td>`+
                                  `<td>${formatStatNumber(types.bloquant, 'bloquant')}</td>`+
                                  `<td><button class='show-day-detail-me-btn' data-date='${date}' style='background:none;border:none;color:#26e0ce;cursor:pointer;font-size:1.1em;'>▼</button></td>`+
                              `</tr>`;
                              table += `<tr id='me-detail-${date}' style='display:none;background:#23272f;'><td colspan='7'></td></tr>`;
                          });
                          table += `</tbody></table>`;
                          document.getElementById('me-summary').innerHTML = summary;
                          document.getElementById('me-table').innerHTML = table;
                      } else if (period === 'annee') {
                          const now = new Date();
                          const year = now.getFullYear();
                          let months = [];
                          for (let m=1; m<=12; m++) {
                              const month = year + '-' + (m<10?'0':'')+m;
                              months.push(month);
                          }
                          // Résumé total sur l'année
                          const periodLogs = logs.filter(l => l.date && l.date.startsWith(year.toString()));
                          const types = countTypes(periodLogs);
                          const total = periodLogs.length;
                          summary = `<div style='margin-bottom:8px;'><b>Total appels</b> : <span style='color:#4caf50;font-weight:bold;font-size:1.15em;'>${total}</span> | Normal : ${formatStatNumber(types.normal, 'normal')} | Important : ${formatStatNumber(types.important, 'important')} | Urgent : ${formatStatNumber(types.urgent, 'urgent')} | Bloquant : ${formatStatNumber(types.bloquant, 'bloquant')}</div>`;
                          table += `<table style='width:100%;border-collapse:collapse;margin-top:8px;'>`;
                          table += `<thead><tr style='background:#222;'><th style='padding:6px 14px;'>Mois</th><th>Total</th><th>Normal</th><th>Important</th><th>Urgent</th><th>Bloquant</th><th></th></tr></thead><tbody>`;
                          months.forEach((month, mIdx) => {
                              const monthLogs = logs.filter(l => l.date && l.date.startsWith(month));
                              const types = countTypes(monthLogs);
                              const total = monthLogs.length;
                              const monthName = new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long' });
                              table += `<tr style='background:${mIdx%2?'#23272f':'#1a1d22'};'>`+
                                  `<td style='padding:6px 14px;'>${monthName} ${month}</td>`+
                                  `<td style='font-weight:bold;color:#4caf50;'>${total}</td>`+
                                  `<td>${formatStatNumber(types.normal, 'normal')}</td>`+
                                  `<td>${formatStatNumber(types.important, 'important')}</td>`+
                                  `<td>${formatStatNumber(types.urgent, 'urgent')}</td>`+
                                  `<td>${formatStatNumber(types.bloquant, 'bloquant')}</td>`+
                                  `<td><button class='show-month-detail-me-btn' data-month='${month}' style='background:none;border:none;color:#26e0ce;cursor:pointer;font-size:1.1em;'>▼</button></td>`+
                              `</tr>`;
                              table += `<tr id='me-detail-${month}' style='display:none;background:#23272f;'><td colspan='7'></td></tr>`;
                          });
                          table += `</tbody></table>`;
                          document.getElementById('me-summary').innerHTML = summary;
                          document.getElementById('me-table').innerHTML = table;
          } else {
                          const types = countTypes(logs);
                          const total = logs.length;
                          summary = `<div style='margin-bottom:8px;'><b>Total appels</b> : <span style='color:#4caf50;font-weight:bold;font-size:1.15em;'>${total}</span> | Normal : ${formatStatNumber(types.normal, 'normal')} | Important : ${formatStatNumber(types.important, 'important')} | Urgent : ${formatStatNumber(types.urgent, 'urgent')} | Bloquant : ${formatStatNumber(types.bloquant, 'bloquant')}</div>`;
                          table += `<table style='width:100%;border-collapse:collapse;margin-top:8px;'>`;
                          table += `<thead><tr style='background:#222;'><th style='padding:6px 14px;'>Date</th><th>Heure</th><th>Type</th></tr></thead><tbody>`;
                          logs.sort((a, b) => (b.date + (b.time||'')).localeCompare(a.date + (a.time||'')));
                          logs.forEach(log => {
                              table += `<tr><td style='padding:6px 14px;'>${log.date || ''}</td><td style='padding:6px 14px;'>${log.time || ''}</td><td style='padding:6px 14px;'>${formatTypeLabel(log.type || '')}</td></tr>`;
                          });
                          table += `</tbody></table>`;
                          document.getElementById('me-summary').innerHTML = summary;
                          document.getElementById('me-table').innerHTML = table;
                      }
                      // Listeners pour dérouler les détails jour/mois
                      document.querySelectorAll('.show-day-detail-me-btn').forEach(btn => {
                          btn.onclick = function() {
                              const date = this.getAttribute('data-date');
                              const detailRow = document.getElementById('me-detail-' + date);
                              if (!detailRow) return;
                              if (detailRow.style.display === 'none') {
                                  // Affiche le détail
                                  const dayLogs = logs.filter(l => l.date === date);
                                  let detailHtml = `<table style='width:100%;border-collapse:collapse;'><thead><tr style='background:#23272f;'><th style='padding:6px 14px;'>Heure</th><th>Type</th></tr></thead><tbody>`;
                                  dayLogs.sort((a, b) => (b.time||'').localeCompare(a.time||''));
                                  dayLogs.forEach(log => {
                                      detailHtml += `<tr><td style='padding:6px 14px;'>${log.time || ''}</td><td style='padding:6px 14px;'>${formatTypeLabel(log.type || '')}</td></tr>`;
                                  });
                                  detailHtml += `</tbody></table>`;
                                  detailRow.children[0].innerHTML = detailHtml;
                                  detailRow.style.display = '';
          } else {
                                  detailRow.style.display = 'none';
                              }
                          };
                      });
                      document.querySelectorAll('.show-month-detail-me-btn').forEach(btn => {
                          btn.onclick = function() {
                              const month = this.getAttribute('data-month');
                              const detailRow = document.getElementById('me-detail-' + month);
                              if (!detailRow) return;
                              if (detailRow.style.display === 'none') {
                                  // Affiche le détail
                                  const monthLogs = logs.filter(l => l.date && l.date.startsWith(month));
                                  let detailHtml = `<table style='width:100%;border-collapse:collapse;'><thead><tr style='background:#23272f;'><th style='padding:6px 14px;'>Date</th><th>Heure</th><th>Type</th></tr></thead><tbody>`;
                                  monthLogs.sort((a, b) => (b.date + (b.time||'')).localeCompare(a.date + (a.time||'')));
                                  monthLogs.forEach(log => {
                                      detailHtml += `<tr><td style='padding:6px 14px;'>${log.date || ''}</td><td style='padding:6px 14px;'>${log.time || ''}</td><td style='padding:6px 14px;'>${formatTypeLabel(log.type || '')}</td></tr>`;
                                  });
                                  detailHtml += `</tbody></table>`;
                                  detailRow.children[0].innerHTML = detailHtml;
                                  detailRow.style.display = '';
                              } else {
                                  detailRow.style.display = 'none';
                              }
                          };
                      });
                  }
                  renderTable(filter);
                  document.getElementById('cloture-filter-me').onchange = function() {
                      renderTable(this.value);
                  };
              }).catch(err => {
                  statsContent.innerHTML = 'Erreur lors du chargement de vos stats.';
              });
          } else {
              // Stats des autres utilisateurs - refonte
              firebase.database().ref('users').once('value').then(snapshot => {
                  const users = snapshot.val() || {};
                  const currentUser = getCurrentUserName();
                  // Prépare la liste des utilisateurs (hors soi-même)
                  const userList = Object.entries(users)
                      .filter(([name, data]) => decodeURIComponent(name) !== currentUser)
                      .map(([name, data]) => ({ name: decodeURIComponent(name), data }));
                  // Filtre global
                  let filter = 'jour';
                  // Génère le sélecteur global
                  let filterHtml = `<div style='margin-bottom:18px;'><label for='cloture-filter-global' style='margin-right:8px;'>Filtrer par :</label><select id='cloture-filter-global' style='padding:4px 10px;border-radius:6px;'>` +
                      `<option value='jour'>Jour</option>`+
                      `<option value='semaine'>Semaine</option>`+
                      `<option value='mois'>Mois</option>`+
                      `<option value='annee'>Année</option>`+
                      `<option value='tout'>Tout</option>`+
                      `</select></div>`;
                  // Conteneur scrollable
                  let html = filterHtml + `<div id='users-stats-list' style='max-height:420px;overflow-y:auto;text-align:left;'>`;
                  userList.forEach(({ name, data }, idx) => {
                      const logs = data && data.clotures_log ? Object.values(data.clotures_log) : [];
                      // Ajout du rang et de l'XP
                      const xp = data && typeof data.xp === 'number' ? data.xp : 0;
                      const rank = getCurrentRank(xp).name;
                      const baseRank = getRankBaseName(rank);
                      const rankColor = rankColors[baseRank] || '#fff';
                      html += `<div class='user-stats-block' style='margin-bottom:32px;padding:18px 18px 12px 18px;background:#23272f;border-radius:16px;box-shadow:0 0 16px 2px #fff3;position:relative;transition:box-shadow 0.3s;'>`;
                      html += `<div style='font-size:1.18em;font-weight:bold;margin-bottom:8px;color:#fff;display:flex;align-items:center;cursor:pointer;text-shadow:0 0 8px #fff8;' class='user-toggle' data-idx='${idx}'>`;
                      html += `<span style='margin-right:8px;transition:transform 0.2s;' id='arrow-${idx}'>▼</span><span style='color:#fff;font-weight:bold;'>${name}</span> <span style='font-size:0.95em;font-weight:normal;color:#fff;margin-left:16px;'>— <span style='color:${rankColor};font-weight:bold;'>${rank}</span> — <span style='color:#26e0ce;font-weight:bold;'>${xp} XP</span></span>`;
                      html += `</div>`;
                      html += `<div id='user-summary-${idx}'></div>`;
                      html += `<div id='user-table-${idx}' style='display:none;'></div>`;
                      html += `</div>`;
                  });
                  html += `</div>`;
                  statsContent.innerHTML = html;
                  // Fonction de filtrage et rendu
                  function filterLogs(logs, period) {
                          const now = new Date();
                          if (period === 'jour') {
                              const today = now.toISOString().slice(0,10);
                          return logs.filter(l => l.date === today);
                          } else if (period === 'semaine') {
                              const weekStart = new Date(now);
                          weekStart.setDate(now.getDate() - now.getDay() + 1); // Lundi
                          const weekDates = [];
                          for (let i=0; i<7; i++) {
                              const d = new Date(weekStart);
                              d.setDate(weekStart.getDate() + i);
                              weekDates.push(d.toISOString().slice(0,10));
                          }
                          return logs.filter(l => weekDates.includes(l.date));
                          } else if (period === 'mois') {
                              const ym = now.toISOString().slice(0,7);
                          return logs.filter(l => l.date && l.date.startsWith(ym));
                          } else if (period === 'annee') {
                              const y = now.getFullYear().toString();
                          return logs.filter(l => l.date && l.date.startsWith(y));
                      }
                      return logs;
                  }
                  function countTypes(logs) {
                      const types = { normal: 0, important: 0, urgent: 0, bloquant: 0 };
                      logs.forEach(l => { if (types[l.type] !== undefined) types[l.type]++; });
                      return types;
                  }
                  function renderAllTables(period) {
                      userList.forEach(({ name, data }, idx) => {
                          const logs = data && data.clotures_log ? Object.values(data.clotures_log) : [];
                          let summary = '';
                          let table = '';
                          if (period === 'jour') {
                              // JOUR : résumé + détail déroulable
                              const filtered = filterLogs(logs, period);
                              const types = countTypes(filtered);
                              const total = filtered.length;
                              summary = `<div style='margin-bottom:8px;'><b>Total appels</b> : <span style='color:#4caf50;font-weight:bold;font-size:1.15em;'>${total}</span> | Normal : ${formatStatNumber(types.normal, 'normal')} | Important : ${formatStatNumber(types.important, 'important')} | Urgent : ${formatStatNumber(types.urgent, 'urgent')} | Bloquant : ${formatStatNumber(types.bloquant, 'bloquant')}</div>`;
                              table += `<table style='width:100%;border-collapse:collapse;margin-top:8px;'>`;
                              table += `<thead><tr style='background:#222;'><th style='padding:6px 14px;'>Heure</th><th>Type</th></tr></thead><tbody>`;
                              filtered.sort((a, b) => (b.time||'').localeCompare(a.time||''));
                              filtered.forEach(log => {
                                  table += `<tr><td style='padding:6px 14px;'>${log.time || ''}</td><td style='padding:6px 14px;'>${formatTypeLabel(log.type || '')}</td></tr>`;
                              });
                              table += `</tbody></table>`;
                              document.getElementById('user-summary-' + idx).innerHTML = summary;
                              document.getElementById('user-table-' + idx).innerHTML = table;
                          } else if (period === 'semaine' || period === 'mois') {
                              // SEMAINE/MOIS : tableau synthétique par jour
                              let days = [];
                              const now = new Date();
                              if (period === 'semaine') {
                                  const weekStart = new Date(now);
                                  weekStart.setDate(now.getDate() - now.getDay() + 1); // Lundi
                                  for (let i=0; i<7; i++) {
                                      const d = new Date(weekStart);
                                      d.setDate(weekStart.getDate() + i);
                                      days.push(d.toISOString().slice(0,10));
                                  }
                              } else if (period === 'mois') {
                                  const ym = now.toISOString().slice(0,7);
                                  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
                                  for (let d=1; d<=daysInMonth; d++) {
                                      days.push(ym + '-' + (d<10?'0':'')+d);
                                  }
                              }
                              // Résumé total sur la période
                              const periodLogs = logs.filter(l => days.includes(l.date));
                              const types = countTypes(periodLogs);
                              const total = periodLogs.length;
                              summary = `<div style='margin-bottom:8px;'><b>Total appels</b> : <span style='color:#4caf50;font-weight:bold;font-size:1.15em;'>${total}</span> | Normal : ${formatStatNumber(types.normal, 'normal')} | Important : ${formatStatNumber(types.important, 'important')} | Urgent : ${formatStatNumber(types.urgent, 'urgent')} | Bloquant : ${formatStatNumber(types.bloquant, 'bloquant')}</div>`;
                              table += `<table style='width:100%;border-collapse:collapse;margin-top:8px;'>`;
                              table += `<thead><tr style='background:#222;'><th style='padding:6px 14px;'>Date</th><th>Total</th><th>Normal</th><th>Important</th><th>Urgent</th><th>Bloquant</th><th></th></tr></thead><tbody>`;
                              days.forEach((date, dIdx) => {
                                  const dayLogs = logs.filter(l => l.date === date);
                                  const types = countTypes(dayLogs);
                                  const total = dayLogs.length;
                                  const dayName = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long' });
                                  table += `<tr style='background:${dIdx%2?'#23272f':'#1a1d22'};'>`+
                                      `<td style='padding:6px 14px;'>${dayName} ${date}</td>`+
                                      `<td style='font-weight:bold;color:#4caf50;'>${total}</td>`+
                                      `<td>${formatStatNumber(types.normal, 'normal')}</td>`+
                                      `<td>${formatStatNumber(types.important, 'important')}</td>`+
                                      `<td>${formatStatNumber(types.urgent, 'urgent')}</td>`+
                                      `<td>${formatStatNumber(types.bloquant, 'bloquant')}</td>`+
                                      `<td><button class='show-day-detail-btn' data-idx='${idx}' data-date='${date}' style='background:none;border:none;color:#26e0ce;cursor:pointer;font-size:1.1em;'>▼</button></td>`+
                                  `</tr>`;
                                  table += `<tr id='detail-${idx}-${date}' style='display:none;background:#23272f;'><td colspan='7'></td></tr>`;
                              });
                              table += `</tbody></table>`;
                              document.getElementById('user-summary-' + idx).innerHTML = summary;
                              document.getElementById('user-table-' + idx).innerHTML = table;
                          } else if (period === 'annee') {
                              // ANNEE : tableau synthétique par mois
                              const now = new Date();
                              const year = now.getFullYear();
                              let months = [];
                              for (let m=1; m<=12; m++) {
                                  const month = year + '-' + (m<10?'0':'')+m;
                                  months.push(month);
                              }
                              // Résumé total sur l'année
                              const periodLogs = logs.filter(l => l.date && l.date.startsWith(year.toString()));
                              const types = countTypes(periodLogs);
                              const total = periodLogs.length;
                              summary = `<div style='margin-bottom:8px;'><b>Total appels</b> : <span style='color:#4caf50;font-weight:bold;font-size:1.15em;'>${total}</span> | Normal : ${formatStatNumber(types.normal, 'normal')} | Important : ${formatStatNumber(types.important, 'important')} | Urgent : ${formatStatNumber(types.urgent, 'urgent')} | Bloquant : ${formatStatNumber(types.bloquant, 'bloquant')}</div>`;
                              table += `<table style='width:100%;border-collapse:collapse;margin-top:8px;'>`;
                              table += `<thead><tr style='background:#222;'><th style='padding:6px 14px;'>Mois</th><th>Total</th><th>Normal</th><th>Important</th><th>Urgent</th><th>Bloquant</th><th></th></tr></thead><tbody>`;
                              months.forEach((month, mIdx) => {
                                  const monthLogs = logs.filter(l => l.date && l.date.startsWith(month));
                                  const types = countTypes(monthLogs);
                                  const total = monthLogs.length;
                                  const monthName = new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long' });
                                  table += `<tr style='background:${mIdx%2?'#23272f':'#1a1d22'};'>`+
                                      `<td style='padding:6px 14px;'>${monthName} ${month}</td>`+
                                      `<td style='font-weight:bold;color:#4caf50;'>${total}</td>`+
                                      `<td>${formatStatNumber(types.normal, 'normal')}</td>`+
                                      `<td>${formatStatNumber(types.important, 'important')}</td>`+
                                      `<td>${formatStatNumber(types.urgent, 'urgent')}</td>`+
                                      `<td>${formatStatNumber(types.bloquant, 'bloquant')}</td>`+
                                      `<td><button class='show-month-detail-btn' data-idx='${idx}' data-month='${month}' style='background:none;border:none;color:#26e0ce;cursor:pointer;font-size:1.1em;'>▼</button></td>`+
                                  `</tr>`;
                                  table += `<tr id='detail-${idx}-${month}' style='display:none;background:#23272f;'><td colspan='7'></td></tr>`;
                              });
                              table += `</tbody></table>`;
                              document.getElementById('user-summary-' + idx).innerHTML = summary;
                              document.getElementById('user-table-' + idx).innerHTML = table;
                          } else {
                              // TOUT : résumé global + détail complet
                              const filtered = filterLogs(logs, period);
                              const types = countTypes(filtered);
                              const total = filtered.length;
                              summary = `<div style='margin-bottom:8px;'><b>Total appels</b> : <span style='color:#4caf50;font-weight:bold;font-size:1.15em;'>${total}</span> | Normal : ${formatStatNumber(types.normal, 'normal')} | Important : ${formatStatNumber(types.important, 'important')} | Urgent : ${formatStatNumber(types.urgent, 'urgent')} | Bloquant : ${formatStatNumber(types.bloquant, 'bloquant')}</div>`;
                              table += `<table style='width:100%;border-collapse:collapse;margin-top:8px;'>`;
                              table += `<thead><tr style='background:#222;'><th style='padding:6px 14px;'>Date</th><th>Type</th></tr></thead><tbody>`;
                              filtered.sort((a, b) => (b.date + (b.time||'')).localeCompare(a.date + (a.time||''))).forEach(log => {
                                  table += `<tr><td style='padding:6px 14px;'>${log.date || ''} ${log.time || ''}</td><td style='padding:6px 14px;'>${formatTypeLabel(log.type || '')}</td></tr>`;
                              });
                              table += `</tbody></table>`;
                              document.getElementById('user-summary-' + idx).innerHTML = summary;
                              document.getElementById('user-table-' + idx).innerHTML = table;
                          }
                      });
                      // Listeners pour dérouler les détails jour/mois
                      document.querySelectorAll('.show-day-detail-btn').forEach(btn => {
                          btn.onclick = function() {
                              const idx = this.getAttribute('data-idx');
                              const date = this.getAttribute('data-date');
                              const detailRow = document.getElementById('detail-' + idx + '-' + date);
                              if (!detailRow) return;
                              if (detailRow.style.display === 'none') {
                                  // Affiche le détail
                                  const user = userList[idx];
                                  const logs = user.data && user.data.clotures_log ? Object.values(user.data.clotures_log) : [];
                                  const dayLogs = logs.filter(l => l.date === date);
                                  let detailHtml = `<table style='width:100%;border-collapse:collapse;'><thead><tr style='background:#23272f;'><th style='padding:6px 14px;'>Heure</th><th>Type</th></tr></thead><tbody>`;
                                  dayLogs.sort((a, b) => (b.time||'').localeCompare(a.time||''));
                                  dayLogs.forEach(log => {
                                      detailHtml += `<tr><td style='padding:6px 14px;'>${log.time || ''}</td><td style='padding:6px 14px;'>${formatTypeLabel(log.type || '')}</td></tr>`;
                                  });
                                  detailHtml += `</tbody></table>`;
                                  detailRow.children[0].innerHTML = detailHtml;
                                  detailRow.style.display = '';
          } else {
                                  detailRow.style.display = 'none';
                              }
                          };
                      });
                      document.querySelectorAll('.show-month-detail-btn').forEach(btn => {
                          btn.onclick = function() {
                              const idx = this.getAttribute('data-idx');
                              const month = this.getAttribute('data-month');
                              const detailRow = document.getElementById('detail-' + idx + '-' + month);
                              if (!detailRow) return;
                              if (detailRow.style.display === 'none') {
                                  // Affiche le détail
                                  const user = userList[idx];
                                  const logs = user.data && user.data.clotures_log ? Object.values(user.data.clotures_log) : [];
                                  const monthLogs = logs.filter(l => l.date && l.date.startsWith(month));
                                  let detailHtml = `<table style='width:100%;border-collapse:collapse;'><thead><tr style='background:#23272f;'><th style='padding:6px 14px;'>Date</th><th>Heure</th><th>Type</th></tr></thead><tbody>`;
                                  monthLogs.sort((a, b) => (b.date + (b.time||'')).localeCompare(a.date + (a.time||'')));
                                  monthLogs.forEach(log => {
                                      detailHtml += `<tr><td style='padding:6px 14px;'>${log.date || ''}</td><td style='padding:6px 14px;'>${log.time || ''}</td><td style='padding:6px 14px;'>${formatTypeLabel(log.type || '')}</td></tr>`;
                                  });
                                  detailHtml += `</tbody></table>`;
                                  detailRow.children[0].innerHTML = detailHtml;
                                  detailRow.style.display = '';
          } else {
                                  detailRow.style.display = 'none';
                              }
                          };
                      });
                  }
                  // Premier rendu
                  renderAllTables(filter);
                  // Listener sur le filtre global
                  document.getElementById('cloture-filter-global').onchange = function() {
                      filter = this.value;
                      renderAllTables(filter);
                  };
                  // Listener pour le toggle (flèche)
                  document.querySelectorAll('.user-toggle').forEach(el => {
                      el.onclick = function() {
                          const idx = this.getAttribute('data-idx');
                          const table = document.getElementById('user-table-' + idx);
                          const arrow = document.getElementById('arrow-' + idx);
                          if (table.style.display === 'none') {
                              table.style.display = '';
                              arrow.style.transform = 'rotate(180deg)';
              } else {
                              table.style.display = 'none';
                              arrow.style.transform = '';
                          }
                      };
                  });
              }).catch(err => {
                  statsContent.innerHTML = 'Erreur lors du chargement des stats.';
              });
          }
      }
      function showPodiumPopup() {
          let old = document.getElementById('podium-popup');
          if (old) old.remove();
          let oldBg = document.getElementById('podium-bg');
          if (oldBg) oldBg.remove();
          const bg = document.createElement('div');
          bg.id = 'podium-bg';
          bg.style.cssText = `
              position: fixed;
              top: 0; left: 0; right: 0; bottom: 0;
              background: rgba(0,0,0,0.35);
              z-index: 9999;
              animation: fadeInBg 0.3s;
          `;
          document.body.appendChild(bg);
          const popup = document.createElement('div');
          popup.id = 'podium-popup';
          // Fond unique pour tous les thèmes
          popup.style.cssText = `
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(34,40,49,0.93);
              color: #f3f6fa;
              border-radius: 18px;
              box-shadow: 0 0 32px 8px #26e0ce, 0 8px 32px rgba(0,0,0,0.18);
              z-index: 10000;
              min-width: 700px;
              max-width: 99vw;
              padding: 64px 80px 48px 80px;
              font-family: 'Segoe UI', Arial, sans-serif;
              text-align: center;
              animation: popupIn 0.3s;
              backdrop-filter: blur(6px);
              border: 2px solid #26e0ce44;
          `;
          popup.innerHTML = `
              <div style="font-size:2.2em;margin-bottom:18px;font-weight:bold;letter-spacing:1px;">🏆 Classement général</div>
              <div id="leaderboard-loading" style="font-size:1.1em;color:#888;margin-bottom:18px;">Chargement du classement...</div>
              <div id="leaderboard-content"></div>
              <button id="close-podium-btn" style="margin-top:22px;padding:9px 28px;border:none;border-radius:8px;background:#4caf50;color:white;font-size:1.1em;cursor:pointer;">Fermer</button>
          `;
          document.body.appendChild(popup);
          document.getElementById('close-podium-btn').onclick = () => {
              popup.remove();
              bg.remove();
          };
          bg.onclick = () => {
              popup.remove();
              bg.remove();
          };
          // Récupère le classement en temps réel depuis Firebase
          firebase.database().ref('users').once('value').then(snapshot => {
              const users = snapshot.val() || {};
              // Transforme en tableau [{name, xp}]
              const leaderboard = Object.entries(users).map(([name, data]) => ({
                  name: decodeURIComponent(name),
                  xp: data.xp || 0,
                  rank: getCurrentRank(data.xp || 0).name
              })).sort((a, b) => b.xp - a.xp);
              // Récupère les ornements sélectionnés pour chaque utilisateur
              const userOrnaments = {};
              const ornamentPromises = Object.entries(users).map(([name, data]) => {
                return firebase.database().ref('users/' + name).once('value').then(snap => {
                  const u = snap.val() || {};
                  userOrnaments[decodeURIComponent(name)] = u.selectedOrnament || null;
                });
              });
              Promise.all(ornamentPromises).then(() => {
              const leaderboardHtml = `
                  <div id='leaderboard-scrollbox' style="max-height:400px;overflow-y:auto;position:relative;scrollbar-width:none;-ms-overflow-style:none;">
                    <ol style="padding-left:0;list-style:none;margin:0;">
                      ${leaderboard.map((user, i) => {
                          const base = getRankBaseName(user.rank);
                        let medal = '';
                        if (i === 0) medal = '<span style=\'font-size:2.1em;vertical-align:middle;display:inline-block;margin-right:8px;\'>🥇</span>';
                        else if (i === 1) medal = '<span style=\'font-size:2.1em;vertical-align:middle;display:inline-block;margin-right:8px;\'>🥈</span>';
                        else if (i === 2) medal = '<span style=\'font-size:2.1em;vertical-align:middle;display:inline-block;margin-right:8px;\'>🥉</span>';
                        let drop = '';
                        if (i === 0) drop = 'drop-shadow(0 0 0px #26e0ce88) drop-shadow(0 0 7px #26e0ce88) drop-shadow(0 0 12px #26e0ce44)';
                        else if (i === 1) drop = 'drop-shadow(0 0 0px #ffd70088) drop-shadow(0 0 6px #ffd70088) drop-shadow(0 0 10px #ffd70044)';
                        else if (i === 2) drop = 'drop-shadow(0 0 0px #b08d5788) drop-shadow(0 0 5px #b08d5788) drop-shadow(0 0 8px #b08d5744)';
                        else drop = 'drop-shadow(0 0 3px #8883)';
                        const rankColor = rankColors[base] || '#fff';
                        // Ornement
                        const ornId = userOrnaments[user.name];
                        let ornamentHtml = '';
                        if (ornId === 'dieu_flamme') {
                          ornamentHtml = `<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:1;">
                            <img src='https://i.imgur.com/ZdQCAkg.png' alt='Flammes' style='width:110px;height:110px;object-fit:contain;pointer-events:none;'/>
                          </span>`;
                        }
                        // Photo de profil + ornement
                        const profileHtml = `<span style="position:relative;display:inline-block;width:90px;height:90px;">${ornamentHtml}<img src=\"${rankLogos[base]}\" alt=\"${base}\" style=\"width:90px;height:90px;vertical-align:middle;object-fit:contain;border-radius:20px;background:transparent;filter:${drop};margin-right:8px;position:relative;z-index:2;\"/></span>`;
                        // Effet flammes sur le nom
                        let nameHtml = `<span style=\"font-weight:bold;color:#e0e0e0;font-size:1.05em;min-width:120px;display:inline-block;\">${user.name}</span>`;
                        if (ornId === 'dieu_flamme') {
                          nameHtml = `<span class='flame-name' style="font-weight:bold;color:#fff;font-size:1.08em;min-width:120px;display:inline-block;position:relative;background:linear-gradient(90deg,#ff9800,#ffd700,#fff,#ffd700,#ff9800);background-size:200% 100%;background-clip:text;-webkit-background-clip:text;color:transparent;-webkit-text-fill-color:transparent;animation:flameTextAnim 2s linear infinite alternate;text-shadow:0 0 8px #ff9800,0 0 18px #ffd700;">${user.name}<span class='flame-anim' style='position:absolute;left:0;right:0;top:-18px;height:18px;pointer-events:none;z-index:2;'></span></span>`;
                        }
                        return `<li style=\"display:flex;align-items:center;gap:18px;justify-content:left;margin:18px 0 18px 0;font-size:1.1em;\">
                          ${profileHtml}
                          ${medal}
                          ${nameHtml}
                          <span style=\"color:${rankColor};font-weight:bold;font-size:1.12em;margin-left:12px;min-width:100px;display:inline-block;\">${user.rank}</span>
                          <span style=\"color:#26e0ce;font-size:1.12em;font-weight:bold;margin-left:12px;\">${user.xp} XP</span>
                          </li>`;
                      }).join('')}
                  </ol>
                </div>
                  <style>
                  @keyframes flameTextAnim {
                    0% { background-position:0% 50%; }
                    100% { background-position:100% 50%; }
                  }
                  </style>`;
                const loadingElem = document.getElementById('leaderboard-loading');
                if (loadingElem) loadingElem.style.display = 'none';
                const leaderboardContent = document.getElementById('leaderboard-content');
                if (leaderboardContent) {
                  leaderboardContent.innerHTML = leaderboardHtml;
                }
              });
          }).catch(err => {
              const loadingElem = document.getElementById('leaderboard-loading');
              if (loadingElem) loadingElem.textContent = 'Erreur lors du chargement du classement.';
              console.error('[Gamification] Erreur lors du chargement du classement:', err);
          });
          // Ajout du JS pour le scroll par flèches
          setTimeout(() => {
            const scrollbox = document.getElementById('leaderboard-scrollbox');
            const up = document.getElementById('leaderboard-arrow-up');
            const down = document.getElementById('leaderboard-arrow-down');
            if (scrollbox && up && down) {
              up.onclick = () => { scrollbox.scrollBy({ top: -120, behavior: 'smooth' }); };
              down.onclick = () => { scrollbox.scrollBy({ top: 120, behavior: 'smooth' }); };
            }
          }, 100);
      }
      function getCurrentUserName() {
          // Cherche dans la systray tous les spans visibles
          const systray = document.querySelector('.o_menu_systray, .o_user_menu, .o_user_menu_name, .oe_topbar_name');
          if (systray) {
              // Prend le texte le plus long (souvent le nom complet)
              const spans = systray.querySelectorAll('span');
              let best = '';
              spans.forEach(s => {
                  const txt = s.textContent.trim();
                  if (txt.length > best.length) best = txt;
              });
              if (best.length > 0) return best;
          }
          // Fallback : cherche dans toute la barre du haut
          const allSpans = document.querySelectorAll('span');
          let best = '';
          allSpans.forEach(s => {
              const txt = s.textContent.trim();
              if (txt.length > best.length) best = txt;
          });
          if (best.length > 0) return best;
          return 'Utilisateur inconnu';
      }
      function awardXPToUser(userName, amount, typeCloture = 'normal', duree = 0) {
          const userRef = firebase.database().ref('users/' + encodeURIComponent(userName));
          userRef.once('value').then(snapshot => {
              const data = snapshot.val();
              const currentXp = data && typeof data.xp === 'number' ? data.xp : 0;
              const newXp = currentXp + amount;
              // Enregistrement du XP
              userRef.update({ xp: newXp })
                  .then(() => {
                      showXPGainNotification(amount);
                      updateUI({ xp: newXp });
                  })
                  .catch(err => {
                      console.error('[Gamification] Erreur lors de l\'écriture Firebase :', err);
                      alert('Erreur Firebase : ' + err.message);
                  });
              // Enregistrement de la cloture détaillée (compteur par jour/type)
              const now = new Date();
              const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
              const timeStr = now.toTimeString().slice(0,5); // HH:mm
              const clotureRef = firebase.database().ref('users/' + encodeURIComponent(userName) + '/clotures/' + dateStr + '/' + typeCloture);
              clotureRef.transaction(current => (current || 0) + 1);
              // Enregistrement du log détaillé (date + heure + type + duree)
              const logRef = firebase.database().ref('users/' + encodeURIComponent(userName) + '/clotures_log');
              logRef.push({ date: dateStr, time: timeStr, type: typeCloture, duree: duree })
                  .then(() => {
                      // Récupérer tous les logs pour vérifier les badges
                      logRef.once('value').then(snapshot => {
                          const logs = snapshot.val() ? Object.values(snapshot.val()) : [];
                          checkAndUnlockBadges(userName, logs);
                      });
                  });
          }).catch(err => {
              console.error('[Gamification] Erreur lors de la lecture Firebase :', err);
              alert('Erreur lecture Firebase : ' + err.message);
          });
      }
      function showXPGainNotification(amount) {
          let notification = document.getElementById('xp-gain-notification');
          if (notification) {
              notification.remove();
          }

          notification = document.createElement('div');
          notification.id = 'xp-gain-notification';
          notification.style.cssText = `                position: fixed;
              top: 90px;
              left: calc(50% - 160px);
              transform: translateX(-50%);
              background: rgba(38, 224, 206, 0.9);
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-family: 'Segoe UI', Arial, sans-serif;
              font-weight: bold;
              font-size: 1.1em;
              z-index: 9999;
              box-shadow: 0 0 20px rgba(38, 224, 206, 0.5);
              animation: xpGainAnimation 2s forwards;
              display: flex;
              align-items: center;
              gap: 8px;
          `;

          notification.innerHTML = `
              <span style="font-size: 1.2em;">✨</span>
              <span>+${amount} XP</span>
          `;

          document.body.appendChild(notification);

          // Supprime la notification après l'animation
          setTimeout(() => {
              notification.remove();
          }, 2000);
      }
      function setupCloturerDetection() {
          // Map pour stocker les tickets en cours de clôture
          const processingTickets = new Map();

          function addListeners() {
              document.querySelectorAll('button, a').forEach(btn => {
                  if (btn.dataset.gamifCloturer) return;
                  if (btn.textContent && btn.textContent.trim().toLowerCase().includes('clôturer')) {
                      btn.dataset.gamifCloturer = '1';
                      btn.addEventListener('click', function() {
                          console.log('[Gamification] Clic sur bouton Clôturer détecté');

                          // Récupérer l'ID du ticket
                          const ticketId = window.location.pathname.split('/').pop();
                          if (!ticketId) return;

                          // Vérifier si le ticket est déjà en cours de traitement
                          if (processingTickets.has(ticketId)) {
                              console.log('[Gamification] Ticket déjà en cours de traitement');
                              return;
                          }

                          // Marquer le ticket comme en cours de traitement
                          processingTickets.set(ticketId, true);

                          setTimeout(() => {
                              // Vérifie si le bouton est désactivé ou si le ticket est passé à l'état clôturé
                              const isDisabled = btn.disabled || btn.classList.contains('disabled') || btn.getAttribute('disabled') !== null;
                              console.log('[Gamification] Etat du bouton Clôturer :', isDisabled ? 'désactivé' : 'actif');
                              // Cherche un badge ou un indicateur d'état
                              const etatCloture = document.querySelector('.o_arrow_button_current[data-value="4"], .badge.bg-danger, .badge.bg-success, .badge.bg-primary');
                              if (etatCloture) {
                                  console.log('[Gamification] Texte du badge trouvé :', etatCloture.textContent.trim());
                              } else {
                                  console.log('[Gamification] Aucun badge d\'état trouvé');
                              }
                              if (
                                  isDisabled ||
                                  (etatCloture && /cl[ôo]tur[ée]|résolu/i.test(etatCloture.textContent))
                              ) {
                                  const userName = getCurrentUserName();
                                  // Détection du nombre d'étoiles (Priorité)
                                  let xp = 100;
                                  let nbEtoiles = 0;
                                  let typeCloture = 'normal';
                                  const prioriteRow = document.querySelector('.o_form_view .o_field_widget.o_field_priority, .o_form_view .o_priority, .o_form_view [name="priority"]');
                                  if (prioriteRow) {
                                      nbEtoiles = prioriteRow.querySelectorAll('.fa-star, .o_rating_star_full, .o_priority_star.o_full').length;
                                      if (nbEtoiles === 1) { xp = 120; typeCloture = 'important'; }
                                      else if (nbEtoiles === 2) { xp = 140; typeCloture = 'urgent'; }
                                      else if (nbEtoiles === 3) { xp = 200; typeCloture = 'bloquant'; }
                                      else { xp = 100; typeCloture = 'normal'; }
                                      console.log('[Gamification] Priorité détectée :', nbEtoiles, 'étoiles, XP =', xp, ', type =', typeCloture);
                                  }
                                  // Fallback couleur si jamais la priorité n'est pas trouvée
                                  let titreElem = document.querySelector('.o_form_view input[name="name"], .o_form_view .o_field_widget.o_field_char, .o_form_view h1, .o_form_view .o_form_label');
                                  let color = '';
                                  if (titreElem) {
                                      let el = titreElem;
                                      while (el && el.classList && !el.classList.contains('o_form_view')) {
                                          color = window.getComputedStyle(el).color;
                                          if (color && color !== 'rgb(234, 234, 234)' && color !== 'rgb(0, 0, 0)' && color !== 'rgb(255, 255, 255)') break;
                                          el = el.parentElement;
                                      }
                                      if (!color) color = window.getComputedStyle(titreElem).color;
                                      console.log('[Gamification] Couleur du titre détectée (robuste) :', color);
                                      let r, g, b;
                                      const match = color.match(/rgb\((\d+), (\d+), (\d+)\)/);
                                      if (match) {
                                          r = parseInt(match[1]);
                                          g = parseInt(match[2]);
                                          b = parseInt(match[3]);
                                          if (r > 200 && g < 100 && b < 100) { xp = 180; typeCloture = 'important'; }
                                          else if (r > 200 && g > 100 && b < 100) { xp = 140; typeCloture = 'urgent'; }
                                          else if (g > 150 && r < 100 && b < 100) { xp = 120; typeCloture = 'bloquant'; }
                                      }
                                  }
                                  console.log('[Gamification] Nom utilisateur détecté :', userName);
                                  console.log('[Gamification] Attribution de', xp, 'XP à', userName, 'Type:', typeCloture);
                                  // === NOUVEAU : récupération de la durée du timer ===
                                  let duree = 0;
                                  let timerElem = document.querySelector('span[name="timer_start"]');
                                  if (!timerElem) {
                                      timerElem = Array.from(document.querySelectorAll('.o_form_view *')).find(el => /\d{1,2}:\d{2}(:\d{2})?/.test(el.textContent));
                                  }
                                  if (timerElem) {
                                      const match = timerElem.textContent.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
                                      if (match) {
                                          const h = match[3] ? parseInt(match[1], 10) : 0;
                                          const m = match[3] ? parseInt(match[2], 10) : parseInt(match[1], 10);
                                          const s = match[3] ? parseInt(match[3], 10) : parseInt(match[2], 10);
                                          duree = h * 60 + m + (s >= 30 ? 1 : 0); // arrondi à la minute supérieure si >30s
                                      }
                                  }
                                  console.log('[Gamification] Durée détectée (minutes) :', duree);
                                  awardXPToUser(userName, xp, typeCloture, duree);
                              } else {
                                  console.log('[Gamification] Condition non remplie : XP non attribuée');
                              }

                              // Retirer le ticket de la liste des tickets en cours de traitement
                              processingTickets.delete(ticketId);
                          }, 1200);
                      });
                  }
              });
          }
          // Premier scan
          addListeners();
          // Observe le DOM pour les nouveaux boutons
          const observer = new MutationObserver(addListeners);
          observer.observe(document.body, { childList: true, subtree: true });
      }
      setupCloturerDetection();
      function waitForUserNameAndInit() {
          let tries = 0;
          function tryInit() {
              const userName = getCurrentUserName();
              if (userName && userName !== 'Utilisateur inconnu') {
                  console.log('[Gamification] Utilisateur détecté au chargement :', userName);
                  console.log('[Gamification] Début de la lecture XP Firebase pour', userName);
                  if (typeof firebase === 'undefined') {
                      console.error('[Gamification] Firebase N\'EST PAS chargé !');
                      return;
                  }
                  firebase.database().ref('users/' + encodeURIComponent(userName)).once('value').then(snapshot => {
                      const data = snapshot.val();
                      const xp = data && typeof data.xp === 'number' ? data.xp : 0;
                      console.log('[Gamification] Lecture Firebase pour', userName, ':', data, '=> XP utilisée :', xp);
                      updateUI({ xp });
                  });
              } else if (tries < 20) { // essaie pendant 4 secondes max
                  tries++;
                  setTimeout(tryInit, 200);
              } else {
                  console.warn('[Gamification] Impossible de trouver le nom utilisateur après plusieurs essais.');
              }
          }
          tryInit();
      }
      waitForUserNameAndInit();
      addPodiumButton();
      // --- Ajout : observer de changement d'URL pour SPA ---
      let lastUrl = window.location.href;
      setInterval(() => {
          if (window.location.href !== lastUrl) {
              lastUrl = window.location.href;
              // Recharge l'XP utilisateur pour updateUI
              const userName = getCurrentUserName();
              if (userName && userName !== 'Utilisateur inconnu') {
                  firebase.database().ref('users/' + encodeURIComponent(userName)).once('value').then(snapshot => {
                      const data = snapshot.val();
                      const xp = data && typeof data.xp === 'number' ? data.xp : 0;
                      updateUI({ xp });
                  });
              }
              // Affiche/masque les boutons Classement et Badges selon la page
              const url = window.location.href;
              const isTicketList = url.includes('model=helpdesk.ticket') && url.includes('view_type=list');
              const isTicketForm = url.includes('model=helpdesk.ticket') && url.includes('view_type=form');
              const podiumBtn = document.getElementById('podium-btn');
              const badgesBtn = document.getElementById('badges-btn');
              if (podiumBtn) podiumBtn.style.display = (isTicketList || isTicketForm) ? '' : 'none';
              if (badgesBtn) badgesBtn.style.display = (isTicketList || isTicketForm) ? '' : 'none';
              // Ajout automatique des boutons si besoin
              addPodiumButton();
              addBadgesButton();
          }
      }, 500);
      if (!document.getElementById('podium-animations')) {
          const style = document.createElement('style');
          style.id = 'podium-animations';
          style.innerHTML = `
              @keyframes popupIn { from { opacity:0; transform:translate(-50%,-60%);} to { opacity:1; transform:translate(-50%,-50%);} }
              @keyframes fadeInBg { from { opacity:0; } to { opacity:1; } }
          `;
          document.head.appendChild(style);
      }
      if (!document.getElementById('rank-animations')) {
          const style = document.createElement('style');
          style.id = 'rank-animations';
          style.innerHTML = `
              @keyframes fadeInNotif { from { opacity:0; } to { opacity:1; } }
              @keyframes glowing {
                  0% { box-shadow: 0 0 8px 2px #fff, 0 0 32px 8px var(--glow-color); }
                  50% { box-shadow: 0 0 32px 16px var(--glow-color), 0 0 64px 24px #fff; }
                  100% { box-shadow: 0 0 8px 2px #fff, 0 0 32px 8px var(--glow-color); }
              }
              @keyframes glowingNotif {
                  0% { box-shadow: 0 0 0 0 var(--glow-color), 0 8px 32px rgba(0,0,0,0.18); }
                  40% { box-shadow: 0 0 64px 24px var(--glow-color), 0 8px 32px rgba(0,0,0,0.18); }
                  100% { box-shadow: 0 0 0 0 var(--glow-color), 0 8px 32px rgba(0,0,0,0.18); }
              }
          `;
          document.head.appendChild(style);
      }
      if (!document.getElementById('xp-animations')) {
          const style = document.createElement('style');
          style.id = 'xp-animations';
          style.innerHTML = `
              @keyframes xpGainAnimation {
                  0% {
                      opacity: 0;
                      transform: translate(-50%, 20px);
                  }
                  20% {
                      opacity: 1;
                      transform: translate(-50%, 0);
                  }
                  80% {
                      opacity: 1;
                      transform: translate(-50%, 0);
                  }
                  100% {
                      opacity: 0;
                      transform: translate(-50%, -20px);
                  }
              }
          `;
          document.head.appendChild(style);
      }
      // Ajoute la fonction pour afficher le popup central de détail d'un jour
      function showDayDetailPopup(date, logs) {
          // Supprime tout popup existant
          let old = document.getElementById('day-detail-popup');
          if (old) old.remove();
          let oldBg = document.getElementById('day-detail-bg');
          if (oldBg) oldBg.remove();
          const bg = document.createElement('div');
          bg.id = 'day-detail-bg';
          bg.style.cssText = `
              position: fixed;
              top: 0; left: 0; right: 0; bottom: 0;
              background: rgba(0,0,0,0.35);
              z-index: 9999;
              animation: fadeInBg 0.3s;
          `;
          document.body.appendChild(bg);
          const popup = document.createElement('div');
          popup.id = 'day-detail-popup';
          popup.style.cssText = `
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(34,40,49,0.93);
              color: #f3f6fa;
              border-radius: 18px;
              box-shadow: 0 0 32px 8px #26e0ce, 0 8px 32px rgba(0,0,0,0.18);
              z-index: 10000;
              min-width: 400px;
              max-width: 99vw;
              padding: 48px 48px 32px 48px;
              font-family: 'Segoe UI', Arial, sans-serif;
              text-align: center;
              animation: popupIn 0.3s;
              backdrop-filter: blur(6px);
              border: 2px solid #26e0ce44;
          `;
          const dayName = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long' });
          const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
          let html = `<div style="font-size:1.5em;margin-bottom:18px;font-weight:bold;letter-spacing:1px;">Détail des appels du ${capitalizedDayName} ${date}</div>`;
          if (logs.length === 0) {
              html += `<div style='color:#aaa;'>Aucun appel clôturé ce jour.</div>`;
          } else {
              html += `<table style='width:100%;border-collapse:collapse;'>
                  <thead><tr style='background:#23272f;'><th style='padding:6px 14px;'>Heure</th><th>Type</th></tr></thead>
                  <tbody>
                      ${logs.sort((a, b) => (b.time || '').localeCompare(a.time || '')).map(log => `<tr><td style='padding:6px 14px;font-size:1.1em;'>${log.time || ''}</td><td style='padding:6px 14px;font-size:1.1em;'>${formatTypeLabel(log.type || '')}</td></tr>`).join('')}
                  </tbody>
              </table>`;
          }
          html += `<button id='close-day-detail-btn' style='margin-top:22px;padding:9px 28px;border:none;border-radius:8px;background:#4caf50;color:white;font-size:1.1em;cursor:pointer;'>Fermer</button>`;
          popup.innerHTML = html;
          document.body.appendChild(popup);
          document.getElementById('close-day-detail-btn').onclick = () => {
              popup.remove();
              bg.remove();
          };
          bg.onclick = () => {
              popup.remove();
              bg.remove();
          };
      }
      window.showDayDetailPopup = showDayDetailPopup;
      // Ajoute la fonction pour afficher le popup central de détail d'une période (semaine/mois)
      function showPeriodDetailPopup(periodLabel, days, logs) {
          // Supprime tout popup existant
          let old = document.getElementById('period-detail-popup');
          if (old) old.remove();
          let oldBg = document.getElementById('period-detail-bg');
          if (oldBg) oldBg.remove();
          const bg = document.createElement('div');
          bg.id = 'period-detail-bg';
          bg.style.cssText = `
              position: fixed;
              top: 0; left: 0; right: 0; bottom: 0;
              background: rgba(0,0,0,0.35);
              z-index: 9999;
              animation: fadeInBg 0.3s;
          `;
          document.body.appendChild(bg);
          const popup = document.createElement('div');
          popup.id = 'period-detail-popup';
          popup.style.cssText = `
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(34,40,49,0.93);
              color: #f3f6fa;
              border-radius: 18px;
              box-shadow: 0 0 32px 8px #26e0ce, 0 8px 32px rgba(0,0,0,0.18);
              z-index: 10000;
              min-width: 400px;
              max-width: 99vw;
              padding: 48px 48px 32px 48px;
              font-family: 'Segoe UI', Arial, sans-serif;
              text-align: center;
              animation: popupIn 0.3s;
              backdrop-filter: blur(6px);
              border: 2px solid #26e0ce44;
          `;
          let html = `<div style="font-size:1.5em;margin-bottom:18px;font-weight:bold;letter-spacing:1px;">Détail : ${periodLabel}</div>`;
          html += `<div style='max-height:420px;overflow-y:auto;'><table style='width:100%;border-collapse:collapse;'>
              <thead><tr style='background:#23272f;'><th style='padding:6px 14px;'>Date</th><th>Normal</th><th>Important</th><th>Urgent</th><th>Bloquant</th><th>Total</th></tr></thead><tbody>`;
          days.forEach(date => {
              const dayLogs = logs.filter(l => l.date === date);
              const types = { normal: 0, important: 0, urgent: 0, bloquant: 0 };
              dayLogs.forEach(l => { if (types[l.type] !== undefined) types[l.type]++; });
              const total = dayLogs.length;
              const dayName = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long' });
              const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
              html += `<tr><td style='padding:6px 14px;'><button class='show-day-detail-btn-popup' data-date='${date}' data-logs='${encodeURIComponent(JSON.stringify(dayLogs))}' style='background:none;border:none;color:#26e0ce;cursor:pointer;font-size:1em;text-decoration:underline;'>${capitalizedDayName} ${date}</button></td>` +
                  `<td>${formatStatNumber(types.normal, 'normal')}</td>` +
                  `<td>${formatStatNumber(types.important, 'important')}</td>` +
                  `<td>${formatStatNumber(types.urgent, 'urgent')}</td>` +
                  `<td>${formatStatNumber(types.bloquant, 'bloquant')}</td>` +
                  `<td><span style='font-size:1.25em;font-weight:bold;color:#fff;'>${total}</span></td></tr>`;
          });
          html += `</tbody></table></div>`;
          html += `<button id='close-period-detail-btn' style='margin-top:22px;padding:9px 28px;border:none;border-radius:8px;background:#4caf50;color:white;font-size:1.1em;cursor:pointer;'>Fermer</button>`;
          popup.innerHTML = html;
          document.body.appendChild(popup);
          document.getElementById('close-period-detail-btn').onclick = () => {
              popup.remove();
              bg.remove();
          };
          bg.onclick = () => {
              popup.remove();
              bg.remove();
          };
          // Ajoute event sur chaque jour du popup
                  setTimeout(() => {
              document.querySelectorAll('.show-day-detail-btn-popup').forEach(btn => {
                  btn.addEventListener('click', function(e) {
                      e.preventDefault();
                      const date = this.getAttribute('data-date');
                      const logs = JSON.parse(decodeURIComponent(this.getAttribute('data-logs')));
                      showDayDetailPopup(date, logs);
              });
      });
          }, 0);
      }

      // === BADGES (HAUTS FAITS) ===
      const allBadges = [
          {
              id: 'poussin_motive',
              name: 'Poussin motivé',
              phrase: 'Il faut un début à tout…',
              description: 'Clôturer 5 tickets en une seule journée',
              img: 'https://i.imgur.com/xYip92S.png',
              check: function(logs) {
                  return logs.length >= 5;
              }
          },
          {
              id: 'roi_tombe',
              name: 'La Tête du roi est tombée...',
              phrase: 'Le trône vacille, tu as frappé fort !',
              description: 'Clôturer plus de 61 tickets en une seule journée',
              img: 'https://i.imgur.com/MaC8BD8.png',
              check: function(logs) {
                  return logs.length > 61;
              }
          },
          {
              id: 'allokoi',
              name: 'Allô quoi !',
              phrase: "J'ai appelé 10 fois. Même Nabilla n'a pas fait mieux.",
              description: 'Clôturer 10 tickets en une seule journée',
              img: 'https://i.imgur.com/ziLlvJr.png',
              check: function(logs) {
                  return logs.length >= 10;
              }
          },
          {
              id: 'agent_007',
              name: 'Agent 007',
              phrase: '0 pause 0 café 7 appels',
              description: 'Clôturer 7 tickets en moins d\'une heure',
              img: 'https://i.imgur.com/t5qs7s8.png',
              check: function(logs) {
                  // On trie les logs par heure croissante
                  const sorted = logs
                      .filter(l => l.time)
                      .sort((a, b) => a.time.localeCompare(b.time));

                  // Pour chaque log, on regarde s'il y a 7 clôtures dans la même heure glissante
                  for (let i = 0; i <= sorted.length - 7; i++) {
                      const first = sorted[i];
                      const last = sorted[i + 6];

                      // Convertir les heures en minutes pour faciliter la comparaison
                      const [firstHour, firstMin] = first.time.split(':').map(Number);
                      const [lastHour, lastMin] = last.time.split(':').map(Number);

                      const firstMinutes = firstHour * 60 + firstMin;
                      const lastMinutes = lastHour * 60 + lastMin;

                      // Vérifier si les 7 clôtures sont dans la même heure
                      if (lastMinutes - firstMinutes <= 60) {
                          return true;
                      }
                  }
                  return false;
              }
          },
          {
              id: 'un_nouvelle_famille',
              name: 'Un Nouvelle Famille',
              phrase: 'Tu es resté assez longtemps avec ce client pour te considérer comme un nouveau membre de la famille, bravo !',
              description: 'Rester plus de 50 minutes avec un client',
              img: 'https://i.imgur.com/I0qNYnJ.png',
              check: function(logs) {
                  return logs.some(l => l.duree && Number(l.duree) >= 50);
              }
          },
          {
              id: 'le_repas_de_famille',
              name: 'Le repas de famille',
              phrase: 'Après être entré dans sa famille, place au repas que tout le monde apprécie tant. Haaa la belle famille…',
              description: 'Rester plus de 2h avec un client au téléphone',
              img: 'https://i.imgur.com/EeN6147.png',
              check: function(logs) {
                  return logs.some(l => l.duree && Number(l.duree) >= 120);
              }
          },
          {
              id: 'naissance_hero',
              name: "La naissance d'un hero ?",
              phrase: "Qu'on mette une cape sur ce super mec / meuf",
              description: '20 appels jours',
              img: 'https://i.imgur.com/kz6asVd.png',
              check: function(logs) {
                  return logs.length >= 20;
              }
          },
          {
              id: 'legende_hotline',
              name: "La légende de la hotline",
              phrase: "tu n'as plus rien à prouver . Mais te la Pete pas non plus .",
              description: "30 appels en une journée",
              img: 'https://i.imgur.com/Z0dagDT.png',
              check: function(logs) {
                  return logs.length >= 30;
              }
          },
          {
              id: 'pastaga_51',
              name: "Ho mon Pastaga que je t'aime",
              phrase: "Ho mon Pastaga que je t'aime",
              description: "51 appels en deux jours (pile-poil 51)",
              img: 'https://i.imgur.com/fTaJQAr.png',
              check: function(logs) {
                  // On cherche deux jours consécutifs avec au total exactement 51 clôtures
                  const byDay = {};
                  logs.forEach(l => { if (l.date) byDay[l.date] = (byDay[l.date]||0)+1; });
                  const dates = Object.keys(byDay).sort();
                  for (let i = 0; i < dates.length - 1; i++) {
                      const d1 = dates[i];
                      const d2 = dates[i+1];
                      // Vérifie que les deux jours sont consécutifs
                      const date1 = new Date(d1);
                      const date2 = new Date(d2);
                      if ((date2 - date1) === 24*60*60*1000) {
                          if ((byDay[d1] + byDay[d2]) === 51) {
                              return true;
                          }
                      }
                  }
                  return false;
              }
          },
          {
              id: 'poussin_tres_motive_retour',
              name: 'le poussin tres motivé (le retour)',
              phrase: "t'es plutot motivé pour un vendredi, en tout cas bien plus que le poussin...",
              description: 'Faire 7 appels un vendredi matin (avant 12h)',
              img: 'https://i.imgur.com/roeGJ7X.png',
              hidden: true,
              check: function(logs) {
                  // Vérifie si c'est un vendredi
                  const today = new Date();
                  if (today.getDay() !== 5) return false;

                  // Compte les appels avant 12h
                  return logs.filter(l => {
                      if (!l.time) return false;
                      const [hours] = l.time.split(':').map(Number);
                      return hours < 12;
                  }).length >= 7;
              }
          },
          {
              id: 'poussin_ultra_motiver_pro_max',
              name: 'Le Poussin ULTRA MOTIVÉ pro max',
              phrase: "Tu veux un verre d'eau ? Un café ? Mais qui peut te stopper ? En tout cas, ce n'est pas le poussin qui va t'aider...",
              description: 'Faire 14 appels un vendredi matin (avant 12h)',
              img: 'https://i.imgur.com/sMlUdBf.png',
              hidden: true,
              check: function(logs) {
                  // Vérifie si c'est un vendredi
                  const today = new Date();
                  if (today.getDay() !== 5) return false;

                  // Compte les appels avant 12h
                  return logs.filter(l => {
                      if (!l.time) return false;
                      const [hours] = l.time.split(':').map(Number);
                      return hours < 12;
                  }).length >= 14;
              }
          }
      ];

      // Ajout du bouton Badges dans le menu
      function addBadgesButton() {
          if (document.getElementById('badges-btn')) return;
          // Chercher le bouton Classement
          const classementBtn = document.getElementById('podium-btn');
          if (!classementBtn) return setTimeout(addBadgesButton, 1000);
          // Cloner le bouton Classement pour garder le style
          const btn = classementBtn.cloneNode(true);
          btn.id = 'badges-btn';
          btn.title = 'Voir les badges';
          btn.setAttribute('data-section', 'badges');
          btn.innerHTML = '<span>🎖️ Badges</span>';
          btn.onclick = (e) => {
              e.stopPropagation();
              showBadgesPopup();
          };
          classementBtn.parentElement.insertAdjacentElement('afterend', btn);
          // === AJOUTER SHOP A GAUCHE DE BADGES ===
          if (!document.getElementById('shop-btn')) {
              const shopBtn = btn.cloneNode(true);
              shopBtn.id = 'shop-btn';
              shopBtn.title = 'Boutique et Récompenses';
              shopBtn.setAttribute('data-section', 'shop');
              shopBtn.innerHTML = '<span>🛍️ Shop / Récompenses</span>';
              shopBtn.onclick = (e) => {
                  e.stopPropagation();
                  showShopPopup();
              };
              btn.parentElement.insertBefore(shopBtn, btn);
          }
      }
      addBadgesButton();

      // Affichage de la popup des badges
      function showBadgesPopup() {
          let old = document.getElementById('badges-popup');
          if (old) old.remove();
          let oldBg = document.getElementById('badges-bg');
          if (oldBg) oldBg.remove();
          const bg = document.createElement('div');
          bg.id = 'badges-bg';
          bg.style.cssText = `position: fixed;top: 0; left: 0; right: 0; bottom: 0;background: rgba(0,0,0,0.35);z-index: 9999;animation: fadeInBg 0.3s;`;
          document.body.appendChild(bg);
          const popup = document.createElement('div');
          popup.id = 'badges-popup';
          popup.style.cssText = `position: fixed;top: 50%;left: 50%;transform: translate(-50%, -50%);background: rgba(34,40,49,0.93);color: #f3f6fa;border-radius: 18px;box-shadow: 0 0 32px 8px #26e0ce, 0 8px 32px rgba(0,0,0,0.18);z-index: 10000;min-width: 0;max-width: 98vw;width:95vw;max-height:90vh;overflow-y:auto;padding: 32px 8vw 24px 8vw;font-family: 'Segoe UI', Arial, sans-serif;text-align: center;animation: popupIn 0.3s;backdrop-filter: blur(6px);border: 2px solid #26e0ce44;`;
          // Ajout d'un style pour masquer la scrollbar mais permettre le scroll
          if (!document.getElementById('badges-scrollbar-style')) {
              const style = document.createElement('style');
              style.id = 'badges-scrollbar-style';
              style.innerHTML = `
              #badges-popup::-webkit-scrollbar { display: none !important; width: 0 !important; }
              #badges-popup { scrollbar-width: none !important; -ms-overflow-style: none !important; }
              @media (max-width: 600px) {
                #badges-popup { padding: 12px 2vw 12px 2vw !important; }
              }
              `;
              document.head.appendChild(style);
          }
          popup.innerHTML = `<div style="font-size:2.2em;margin-bottom:18px;font-weight:bold;letter-spacing:1px;">🎖️ Mes badges</div><div id='badges-list' style='display:flex;flex-wrap:wrap;gap:32px;justify-content:center;'></div><button id="close-badges-btn" style="margin-top:22px;padding:9px 28px;border:none;border-radius:8px;background:#4caf50;color:white;font-size:1.1em;cursor:pointer;">Fermer</button>`;
          document.body.appendChild(popup);
          document.getElementById('close-badges-btn').onclick = () => { popup.remove(); bg.remove(); };
          bg.onclick = () => { popup.remove(); bg.remove(); };
          // Charger les badges débloqués
          const userName = getCurrentUserName();
          firebase.database().ref('users/' + encodeURIComponent(userName) + '/badges').once('value').then(snapshot => {
              const unlocked = snapshot.val() || {};
              const list = document.getElementById('badges-list');
              // Affiche uniquement les badges (pas les ornements)
              list.innerHTML = allBadges.filter(badge => typeof badge.check === 'function').map(badge => {
                  const isUnlocked = unlocked[badge.id];
                  const isHidden = badge.hidden && !isUnlocked;
                  return `<div style='background:${isUnlocked ? '#23272f' : '#181a1f'};border-radius:14px;padding:18px 18px 12px 18px;min-width:180px;max-width:220px;box-shadow:none;display:flex;flex-direction:column;align-items:center;gap:8px;opacity:${isUnlocked?1:0.5};'>
                      <img src='${badge.img}' alt='${isHidden ? 'Badge caché' : badge.name}' class='badge-img-clickable' style='width:70px;height:70px;object-fit:contain;border-radius:50%;background:#e0e0e0;filter:${isUnlocked?'':'grayscale(1) brightness(0.1)'};cursor:${isUnlocked&&!isHidden?'pointer':'default'};${isHidden?'pointer-events:none;':''}' data-img='${badge.img}' data-name='${badge.name}'/>
                      <div style='font-size:1.15em;font-weight:bold;color:#26e0ce;margin-bottom:2px;text-shadow:0 0 12px #26e0ce;'>${isHidden?'???':badge.name}</div>
                      <div style='font-size:1em;color:#fff;margin-bottom:2px;'>${isHidden?'???':badge.phrase}</div>
                      <div style='font-size:0.98em;color:#aaa;'>${isHidden?'???':badge.description}</div>
                      ${isUnlocked ? `<div style='margin-top:6px;color:#4caf50;font-weight:bold;'>Débloqué !</div>` : ''}
                  </div>`;
              }).join('');
              // Ajout du clic pour agrandir l'image
              setTimeout(() => {
                  document.querySelectorAll('.badge-img-clickable').forEach(img => {
                      img.onclick = function(e) {
                          e.stopPropagation();
                          // Supprime toute popup d'image précédente
                          let old = document.getElementById('badge-img-popup');
                          let oldBg = document.getElementById('badge-img-bg');
                          if (old) old.remove();
                          if (oldBg) oldBg.remove();
                          // Crée le fond
                          const bg = document.createElement('div');
                          bg.id = 'badge-img-bg';
                          bg.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:10001;';
                          document.body.appendChild(bg);
                          // Crée la popup
                          const popup = document.createElement('div');
                          popup.id = 'badge-img-popup';
                          popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(34,40,49,0.97);padding:32px 32px 24px 32px;border-radius:18px;box-shadow:0 0 32px 8px #26e0ce,0 8px 32px rgba(0,0,0,0.18);z-index:10002;display:flex;flex-direction:column;align-items:center;';
                          popup.innerHTML = `<img src='${img.dataset.img}' alt='${img.dataset.name}' style='max-width:320px;max-height:320px;object-fit:contain;margin-bottom:18px;border-radius:50%;background:#e0e0e0;'/><div style='color:#26e0ce;font-size:1.2em;font-weight:bold;'>${img.dataset.name}</div><button id='close-badge-img-btn' style='margin-top:18px;padding:8px 24px;border:none;border-radius:8px;background:#4caf50;color:white;font-size:1.1em;cursor:pointer;'>Fermer</button>`;
                          document.body.appendChild(popup);
                          document.getElementById('close-badge-img-btn').onclick = () => { popup.remove(); bg.remove(); };
                          bg.onclick = () => { popup.remove(); bg.remove(); };
                      };
                  });
              }, 0);
          });
      }

      // Affichage de la popup de la boutique
      function showShopPopup() {
          let old = document.getElementById('shop-popup');
          if (old) old.remove();
          let oldBg = document.getElementById('shop-bg');
          if (oldBg) oldBg.remove();
          const bg = document.createElement('div');
          bg.id = 'shop-bg';
          bg.style.cssText = `position: fixed;top: 0; left: 0; right: 0; bottom: 0;background: rgba(0,0,0,0.35);z-index: 9999;animation: fadeInBg 0.3s;`;
          document.body.appendChild(bg);
          const popup = document.createElement('div');
          popup.id = 'shop-popup';
          popup.style.cssText = `position: fixed;top: 50%;left: 50%;transform: translate(-50%, -50%);background: rgba(34,40,49,0.93);color: #f3f6fa;border-radius: 18px;box-shadow: 0 0 32px 8px #26e0ce, 0 8px 32px rgba(0,0,0,0.18);z-index: 10000;min-width: 0;max-width: 98vw;width:95vw;max-height:90vh;overflow-y:auto;padding: 32px 8vw 24px 8vw;font-family: 'Segoe UI', Arial, sans-serif;text-align: center;animation: popupIn 0.3s;backdrop-filter: blur(6px);border: 2px solid #26e0ce44;`;

          // Ajout d'un style pour masquer la scrollbar mais permettre le scroll
          if (!document.getElementById('shop-scrollbar-style')) {
              const style = document.createElement('style');
              style.id = 'shop-scrollbar-style';
              style.innerHTML = `
              #shop-popup::-webkit-scrollbar { display: none !important; width: 0 !important; }
              #shop-popup { scrollbar-width: none !important; -ms-overflow-style: none !important; }
              @media (max-width: 600px) {
                #shop-popup { padding: 12px 2vw 12px 2vw !important; }
              }
              `;
              document.head.appendChild(style);
          }

          popup.innerHTML = `
              <div style="font-size:2.2em;margin-bottom:18px;font-weight:bold;letter-spacing:1px;">🛍️ Shop / Récompenses</div>
              <div style="display:flex;justify-content:center;gap:24px;margin-bottom:32px;">
                  <button class="shop-tab-btn active" data-tab="shop" style="padding:10px 32px;font-size:1.15em;font-weight:bold;border:none;border-radius:12px;background:linear-gradient(90deg,#26e0ce,#209cff);color:#fff;box-shadow:0 2px 12px #26e0ce33,0 1px 2px #0002;transition:background 0.2s,box-shadow 0.2s,transform 0.1s;outline:none;cursor:pointer;letter-spacing:0.5px;">Boutique</button>
                  <button class="shop-tab-btn" data-tab="rewards" style="padding:10px 32px;font-size:1.15em;font-weight:bold;border:none;border-radius:12px;background:#23272f;color:#26e0ce;box-shadow:0 2px 12px #23272f33,0 1px 2px #0002;transition:background 0.2s,box-shadow 0.2s,transform 0.1s;outline:none;cursor:pointer;letter-spacing:0.5px;">Mes Récompenses</button>
              </div>
              <div id="shop-content" class="shop-tab-content active">
                  <div style="margin-bottom:24px;">
                      <img src="https://i.imgur.com/WUkWpPb.png" alt="PoWoo Coin" style="width:32px;height:32px;vertical-align:middle;margin-right:8px;">
                      <span style="font-size:1.2em;font-weight:bold;color:#26e0ce;" id="user-pc-balance">Chargement...</span>
                  </div>
                  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;justify-items:center;" id="shop-items">
                      <div id='shop-coming-soon' style='color:#26e0ce;font-size:1.7em;font-weight:bold;text-align:center;margin:64px auto 0 auto;grid-column:1/-1;display:flex;flex-direction:column;align-items:center;gap:18px;'>
                        <span style='font-size:2.5em;'>🚧</span>
                        <span>Patience, ce n'est pas encore dispo mais promis ça arrive bientôt !</span>
                      </div>
                  </div>
              </div>
              <div id="rewards-content" class="shop-tab-content" style="display:none;">
                  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;justify-items:center;max-width:900px;margin:0 auto;" id="user-rewards">
                      <div style="color:#aaa;">Chargement des récompenses...</div>
                  </div>
              </div>
              <button id="close-shop-btn" style="margin-top:22px;padding:9px 28px;border:none;border-radius:8px;background:#4caf50;color:white;font-size:1.1em;cursor:pointer;">Fermer</button>
          `;
          document.body.appendChild(popup);

          // Ajout du style pour les boutons shop-tab-btn (effet hover, focus, actif)
          if (!document.getElementById('shop-tab-btn-style')) {
              const style = document.createElement('style');
              style.id = 'shop-tab-btn-style';
              style.innerHTML = `
              .shop-tab-btn {
                  padding: 12px 38px;
                  font-size: 1.18em;
                  font-weight: bold;
                  border: none;
                  border-radius: 14px;
                  background: #23272f;
                  color: #bfc1c2;
                  box-shadow: 0 2px 12px #23272f33, 0 1px 2px #0002;
                  transition: background 0.2s, box-shadow 0.2s, color 0.2s, transform 0.1s;
                  outline: none;
                  cursor: pointer;
                  letter-spacing: 0.5px;
                  margin: 0 2px;
              }
              .shop-tab-btn.active, .shop-tab-btn:focus {
                  background: linear-gradient(90deg,#26e0ce,#209cff);
                  color: #fff;
                  box-shadow: 0 2px 16px #26e0ce55, 0 1px 2px #0002;
                  transform: scale(1.04);
              }
              .shop-tab-btn:not(.active) {
                  background: #181a1f;
                  color: #bfc1c2;
                  box-shadow: 0 2px 12px #181a1f33, 0 1px 2px #0002;
              }
              .shop-tab-btn:hover {
                  background: linear-gradient(90deg,#209cff,#26e0ce);
                  color: #fff;
                  box-shadow: 0 2px 18px #209cff55, 0 1px 2px #0002;
                  transform: scale(1.06);
              }
              `;
              document.head.appendChild(style);
          }

          // Gestion des onglets
          document.querySelectorAll('.shop-tab-btn').forEach(btn => {
              btn.onclick = function() {
                  document.querySelectorAll('.shop-tab-btn').forEach(b => b.classList.remove('active'));
                  this.classList.add('active');
                  document.querySelectorAll('.shop-tab-content').forEach(c => c.style.display = 'none');
                  document.getElementById(this.dataset.tab + '-content').style.display = '';
                  // Si on clique sur Boutique, affiche le message "coming soon"
                  if (this.dataset.tab === 'shop') {
                      document.getElementById('shop-coming-soon').style.display = '';
                  }
              };
          });

          document.getElementById('close-shop-btn').onclick = () => { popup.remove(); bg.remove(); };
          bg.onclick = () => { popup.remove(); bg.remove(); };

          // Charger le solde de PC de l'utilisateur
          const userName = getCurrentUserName();
          firebase.database().ref('users/' + encodeURIComponent(userName)).once('value').then(snapshot => {
              const data = snapshot.val() || {};
              const pc = data.pc || 0;
              document.getElementById('user-pc-balance').textContent = pc + ' PC';
          });

          // === ORNEMENTS ===
          function getRankIndex(rankName) {
            return ranks.findIndex(r => r.name === rankName);
          }
          const allOrnaments = [
            {
              id: 'dieu_flamme',
              name: 'Flammes du Dieu des appels',
              img: 'https://i.imgur.com/ZdQCAkg.png',
              description: 'Ornement exclusif pour le rang DIEU DES APPELS',
              minRank: 'DIEU DES APPELS',
              unlock: user => {
                const userRank = getCurrentRank(user.xp).name;
                return getRankIndex(userRank) >= getRankIndex('DIEU DES APPELS');
              }
            },
            {
              id: 'maitre_eclair',
              name: 'Eclairs du Maître des appels',
              img: 'https://i.imgur.com/sKtiPmj.png',
              description: 'Ornement exclusif pour le rang MAÎTRE DES APPELS',
              minRank: 'Maître des appels IV',
              unlock: user => {
                const userRank = getCurrentRank(user.xp).name;
                return getRankIndex(userRank) >= getRankIndex('Maître des appels IV');
              }
            },
            {
              id: 'diamant',
              name: 'Aura du Diamant',
              img: 'https://i.imgur.com/JLyduRZ.png',
              description: 'Ornement exclusif pour le rang DIAMANT',
              minRank: 'Diamant IV',
              unlock: user => {
                const userRank = getCurrentRank(user.xp).name;
                return getRankIndex(userRank) >= getRankIndex('Diamant IV');
              }
            },
            {
              id: 'platine',
              name: 'Aura du Platine',
              img: 'https://i.imgur.com/2gpOrLT.png',
              description: 'Ornement exclusif pour le rang PLATINE',
              minRank: 'Platine IV',
              unlock: user => {
                  const userRank = getCurrentRank(user.xp).name;
                  return getRankIndex(userRank) >= getRankIndex('Platine IV');
              }
            },
            // Ajoute d'autres ornements ici plus tard
          ];

          const rewardsContent = document.getElementById('user-rewards');
          if (rewardsContent) {
            const userName = getCurrentUserName();
            firebase.database().ref('users/' + encodeURIComponent(userName)).once('value').then(snapshot => {
              const user = snapshot.val() || {};
              user.xp = Number(user.xp) || 0;
              // Ornements débloqués
              const unlockedOrnaments = allOrnaments.filter(o => o.unlock(user));
              // Ornement sélectionné
              const selectedOrnament = user.selectedOrnament || null;
              let html = '';
              if (unlockedOrnaments.length === 0) {
                html = `<div style='color:#aaa;'>Aucun ornement débloqué pour le moment.</div>`;
              } else {
                html = unlockedOrnaments.map(orn => `
                  <div style='background:#23272f;border-radius:14px;padding:18px 18px 12px 18px;min-width:180px;max-width:220px;box-shadow:none;display:flex;flex-direction:column;align-items:center;gap:8px;${selectedOrnament===orn.id?'border:2px solid #26e0ce;box-shadow:0 0 16px 4px #26e0ce88;':''}'>
                    <img src='${orn.img}' alt='${orn.name}' style='width:80px;height:80px;object-fit:contain;margin-bottom:8px;'>
                    <div style='font-size:1.15em;font-weight:bold;color:#26e0ce;margin-bottom:2px;'>${orn.name}</div>
                    <div style='font-size:0.98em;color:#aaa;margin-bottom:8px;'>${orn.description}</div>
                    <button class='select-ornament-btn' data-ornament='${orn.id}' style='padding:7px 18px;border:none;border-radius:8px;background:${selectedOrnament===orn.id?'#26e0ce':'#4caf50'};color:white;font-size:1em;cursor:pointer;font-weight:bold;'>${selectedOrnament===orn.id?'Sélectionné':'Sélectionner'}</button>
                  </div>
                `).join('');
              }
              rewardsContent.innerHTML = html;
              // Ajout listeners
              rewardsContent.querySelectorAll('.select-ornament-btn').forEach(btn => {
                btn.onclick = function() {
                  const ornId = this.getAttribute('data-ornament');
                  firebase.database().ref('users/' + encodeURIComponent(userName)).update({ selectedOrnament: ornId }).then(() => {
                    showShopPopup(); // refresh
                  });
                };
              });
            });
          }
      }

      // Fonction pour attribuer des PoWoo Coins
      function awardPCToUser(userName, amount, reason, isRankUp) {
          const userRef = firebase.database().ref('users/' + encodeURIComponent(userName));
          userRef.once('value').then(snapshot => {
              const data = snapshot.val();
              const currentPC = data.pc || 0;
              const newPC = currentPC + amount;
              userRef.update({ pc: newPC }).then(() => {
                  if (isRankUp) {
                      showPCRankUpNotification(amount);
                  } else {
                      showPCGainNotification(amount);
                  }
              });
          });
      }

      // Notification d'obtention de PC
      function showPCGainNotification(amount) {
          let notification = document.getElementById('pc-gain-notification');
          if (notification) notification.remove();

          notification = document.createElement('div');
          notification.id = 'pc-gain-notification';
          notification.style.cssText = `
              position: fixed;
              top: 90px;
              left: calc(50% - 160px);
              transform: translateX(-50%);
              background: rgba(34, 40, 49, 0.95);
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-family: 'Segoe UI', Arial, sans-serif;
              font-weight: bold;
              font-size: 1.1em;
              z-index: 9999;
              box-shadow: 0 0 20px rgba(38, 224, 206, 0.5);
              animation: pcGainAnimation 2s forwards;
              display: flex;
              align-items: center;
              gap: 8px;
              border: 1px solid rgba(255, 255, 255, 0.1);
          `;

          notification.innerHTML = `
              <span style="font-size: 1.2em;">✨</span>
              <span>+${amount} PC</span>
          `;

          document.body.appendChild(notification);

          // Supprime la notification après l'animation
          setTimeout(() => {
              notification.remove();
          }, 2000);
      }

      // Ajout de l'animation pour la notification PC
      if (!document.getElementById('pc-animations')) {
          const style = document.createElement('style');
          style.id = 'pc-animations';
          style.innerHTML = `
              @keyframes pcGainAnimation {
                  0% {
                      opacity: 0;
                      transform: translate(-50%, 20px);
                  }
                  20% {
                      opacity: 1;
                      transform: translate(-50%, 0);
                  }
                  80% {
                      opacity: 1;
                      transform: translate(-50%, 0);
                  }
                  100% {
                      opacity: 0;
                      transform: translate(-50%, -20px);
                  }
              }
          `;
          document.head.appendChild(style);
      }

      // Modification de la fonction awardXPToUser pour inclure les PC
      const originalAwardXPToUser = awardXPToUser;
      awardXPToUser = function(userName, amount, typeCloture = 'normal', duree = 0) {
          originalAwardXPToUser(userName, amount, typeCloture, duree);

          // Vérifier si l'utilisateur a atteint 50 appels pour attribuer des PC
          firebase.database().ref('users/' + encodeURIComponent(userName) + '/clotures_log').once('value').then(snapshot => {
              const logs = snapshot.val() ? Object.values(snapshot.val()) : [];
              if (logs.length >= 50) {
                  awardPCToUser(userName, 10);
              }
          });
      };

      // Vérification des badges à chaque cloture
      function checkAndUnlockBadges(userName, logs) {
          // Ne garder que les logs du jour en cours
          const today = new Date().toISOString().slice(0, 10);
          const todayLogs = logs.filter(log => log.date === today);

          firebase.database().ref('users/' + encodeURIComponent(userName) + '/badges').once('value').then(snapshot => {
              const unlocked = snapshot.val() || {};
              allBadges.forEach(badge => {
                  if (typeof badge.check === 'function' && !unlocked[badge.id]) {
                      // Vérifier le badge uniquement avec les logs du jour
                      if (badge.check(todayLogs)) {
                          console.log('[Gamification] Badge débloqué :', badge.id);
                          // Débloque le badge
                          firebase.database().ref('users/' + encodeURIComponent(userName) + '/badges/' + badge.id).set(true);
                          // Attribue 100 XP pour l'obtention du badge
                          awardXPToUser(userName, 100, 'badge');
                          showBadgeUnlockedNotification(badge);
                      }
                  }
              });
          });
      }

      // Notification animée de badge débloqué
      function showBadgeUnlockedNotification(badge) {
          let notif = document.getElementById('badge-unlocked-notif');
          if (notif) notif.remove();
          notif = document.createElement('div');
          notif.id = 'badge-unlocked-notif';
          notif.style.cssText = `position:fixed;top:32px;left:50%;transform:translateX(-50%) scale(1);background:#23272f;color:#fff;padding:38px 48px 32px 48px;border-radius:28px;box-shadow:0 0 64px 24px #26e0ce,0 8px 32px rgba(0,0,0,0.18);z-index:10001;min-width:320px;max-width:90vw;font-family:'Segoe UI',Arial,sans-serif;text-align:center;font-size:1.25em;display:flex;flex-direction:column;align-items:center;gap:12px;animation:badgeZoomNotif 1.8s infinite alternate;`;
          notif.innerHTML = `<div style='position:absolute;top:18px;right:24px;'><button id='close-badge-unlocked-btn' style='background:none;border:none;font-size:2em;cursor:pointer;color:#ff3b3b;'>×</button></div><div style='font-size:2.2em;font-weight:bold;color:#fff;margin-bottom:10px;text-shadow:0 0 18px #fff,0 0 32px #fff;'>🎉 Félicitations !</div><img src='${badge.img}' alt='${badge.name}' style='width:100px;height:100px;object-fit:contain;margin-bottom:12px;border-radius:50%;box-shadow:0 0 32px 8px #26e0ce88;'/><div style='font-size:1.45em;font-weight:bold;color:#fff;margin-bottom:6px;text-shadow:0 0 8px #26e0ce;'>${badge.name}</div><div style='font-size:1.1em;color:#e0e0e0;margin-bottom:2px;'>${badge.phrase}</div><div style='font-size:1.05em;color:#bfc1c2;'>${badge.description}</div>`;
          document.body.appendChild(notif);
          document.getElementById('close-badge-unlocked-btn').onclick = () => { notif.remove(); };
          // Animation CSS
          if (!document.getElementById('badge-animations')) {
              const style = document.createElement('style');
              style.id = 'badge-animations';
              style.innerHTML = `@keyframes badgeNotifIn { from { top:-120px; opacity:0; } to { top:32px; opacity:1; } }
              @keyframes badgeZoomNotif { 0% { transform:translateX(-50%) scale(1); } 100% { transform:translateX(-50%) scale(1.035); } }`;
              document.head.appendChild(style);
          }
      }

      // Ajout du style CSS global pour glowing si pas déjà présent
      if (!document.getElementById('user-stats-glow-style')) {
          const style = document.createElement('style');
          style.id = 'user-stats-glow-style';
          style.innerHTML = `.user-stats-block { box-shadow:0 0 16px 2px #fff3 !important; }
          .user-stats-block:hover { box-shadow:0 0 32px 6px #fff7 !important; }
          #users-stats-list::-webkit-scrollbar { display: none !important; width: 0 !important; }
          #users-stats-list { scrollbar-width: none !important; -ms-overflow-style: none !important; padding: 18px 18px !important; position: relative; width: calc(100% - 48px) !important; margin: 0 auto !important; }
          .user-stats-block { margin: 0 -18px 32px -18px !important; }
          @media (max-width: 900px) { #me-table { overflow-x: auto !important; width: 100% !important; display: block !important; } }
          #stats-popup { max-height: 90vh !important; overflow-y: auto !important; }
          #stats-popup::-webkit-scrollbar { display: none !important; width: 0 !important; }
          #stats-popup { scrollbar-width: none !important; -ms-overflow-style: none !important; }
          @media (max-width: 700px) { #stats-popup { padding: 18px 4vw 18px 4vw !important; } }`;
          document.head.appendChild(style);
      }

      // --- LOGIQUE PoWoo Coin (PC) ---
      // Attribuer +10 PC lors d'un passage de grade (rank up)
      let lastRankName = null;
      function checkAndAwardPCForRankUp(userName, newRankName) {
          if (!lastRankName) {
              lastRankName = localStorage.getItem('gamif_last_rank_' + userName) || '';
          }
          if (lastRankName !== newRankName) {
              awardPCToUser(userName, 10, 'rankup', true); // true = rankup
              lastRankName = newRankName;
              localStorage.setItem('gamif_last_rank_' + userName, newRankName);
          }
      }
      // Attribuer +10 PC à chaque palier de 50 appels clôturés (50, 100, 150...)
      function checkAndAwardPCForClotures(userName, logs) {
          const count = logs.length;
          const lastPCMilestone = parseInt(localStorage.getItem('gamif_last_pc_milestone_' + userName) || '0', 10);
          const milestone = Math.floor(count / 50) * 50;
          if (milestone > 0 && milestone !== lastPCMilestone) {
              awardPCToUser(userName, 10, 'cloture50');
              localStorage.setItem('gamif_last_pc_milestone_' + userName, milestone);
          }
      }
      // Surcharge de updateUI pour détecter le rank up et attribuer les PC
      const originalUpdateUI = updateUI;
      updateUI = function(userData) {
          originalUpdateUI(userData);
          const userName = getCurrentUserName();
          const currentRank = getCurrentRank(userData.xp);
          checkAndAwardPCForRankUp(userName, currentRank.name);
      };
      // Ajout d'un hook sur la cloture pour les PC (sans toucher à l'XP)
      awardXPToUser = function(userName, amount, typeCloture = 'normal', duree = 0) {
          originalAwardXPToUser(userName, amount, typeCloture, duree);
          // Vérifier les paliers de 50 appels
          firebase.database().ref('users/' + encodeURIComponent(userName) + '/clotures_log').once('value').then(snapshot => {
              const logs = snapshot.val() ? Object.values(snapshot.val()) : [];
              checkAndAwardPCForClotures(userName, logs);
          });
      };
      // --- Notification PC qui part du bouton Shop ---
      function showPCGainNotification(amount) {
          let notification = document.getElementById('pc-gain-notification');
          if (notification) notification.remove();
          // Trouver le bouton Shop
          const shopBtn = document.getElementById('shop-btn');
          if (!shopBtn) return;
          const rect = shopBtn.getBoundingClientRect();
          notification = document.createElement('div');
          notification.id = 'pc-gain-notification';
          notification.style.cssText = `
              position: fixed;
              left: ${rect.left + rect.width/2}px;
              top: ${rect.top + rect.height/2}px;
              transform: translate(-50%, 0);
              background: rgba(38, 224, 206, 0.95);
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-family: 'Segoe UI', Arial, sans-serif;
              font-weight: bold;
              font-size: 1.1em;
              z-index: 9999;
              box-shadow: 0 0 20px rgba(38, 224, 206, 0.5);
              display: flex;
              align-items: center;
              gap: 8px;
              pointer-events: none;
              animation: pcShopGainAnim 3s forwards;
          `;
          notification.innerHTML = `
              <img src="https://i.imgur.com/WUkWpPb.png" alt="PoWoo Coin" style="width:24px;height:24px;">
              <span>+${amount} PC</span>
          `;
          document.body.appendChild(notification);
          setTimeout(() => {
              notification.remove();
          }, 3000);
      }
      if (!document.getElementById('pc-shop-animations')) {
          const style = document.createElement('style');
          style.id = 'pc-shop-animations';
          style.innerHTML = `
              @keyframes pcShopGainAnim {
                  0% {
                      opacity: 0;
                      transform: translate(-50%, 20px) scale(0.7);
                  }
                  10% {
                      opacity: 1;
                      transform: translate(-50%, 0) scale(1.1);
                  }
                  80% {
                      opacity: 1;
                      transform: translate(-50%, -30px) scale(1);
                  }
                  100% {
                      opacity: 0;
                      transform: translate(-50%, -60px) scale(0.7);
                  }
              }
          `;
          document.head.appendChild(style);
      }
      if (!document.getElementById('pc-rankup-animations')) {
          const style = document.createElement('style');
          style.id = 'pc-rankup-animations';
          style.innerHTML = `
              @keyframes pcRankUpAnimBig {
                  0% {
                      opacity: 0;
                      transform: translate(-50%, -40px) scale(0.7);
                      filter: blur(12px);
                  }
                  10% {
                      opacity: 1;
                      transform: translate(-50%, 0) scale(1.1);
                      filter: blur(0px);
                  }
                  40% {
                      opacity: 1;
                      transform: translate(-50%, 220px) scale(1.08);
                      filter: blur(0px);
                  }
                  80% {
                      opacity: 1;
                      transform: translate(-50%, 0) scale(1);
                      filter: blur(0px);
                  }
                  100% {
                      opacity: 0;
                      transform: translate(-50%, 0) scale(0.7);
                      filter: blur(12px);
                  }
              }
          `;
          document.head.appendChild(style);
      }
      // ... existing code ...

      function showPCRankUpNotification(amount) {
          let notification = document.getElementById('pc-rankup-notification');
          if (notification) notification.remove();
          // Trouver le bouton Shop
          const shopBtn = document.getElementById('shop-btn');
          if (!shopBtn) return;
          const rect = shopBtn.getBoundingClientRect();
          // Position de base : pile en bas du bouton Shop
          const baseOffset = rect.bottom + 6;
          // Décalage de descente réduit à 1.5cm (15px)
          const deepOffset = baseOffset + 15;
          // Décalage de remontée augmenté à 3cm (30px) au-dessus de la base
          const upOffset = baseOffset - 30;
          notification = document.createElement('div');
          notification.id = 'pc-rankup-notification';
          notification.style.cssText = `
              position: fixed;
              left: ${rect.left + rect.width/2}px;
              top: 0;
              transform: translate(-50%, ${baseOffset}px);
              background: linear-gradient(90deg, #26e0ce 0%, #209cff 100%); // stops serrés, bords nets
              color: #fff;
              padding: 4px 16px;
              border-radius: 16px;
              font-family: 'Segoe UI', Arial, sans-serif;
              font-weight: bold;
              font-size: 0.98em;
              z-index: 10001;
              box-shadow: none;
              display: flex;
              align-items: center;
              gap: 8px;
              pointer-events: none;
              text-shadow: 0 1px 4px #000a, 0 0 6px #26e0cecc;
              filter: drop-shadow(0 0 16px #26e0ce) drop-shadow(0 0 32px #209cff88);
          `;
          notification.innerHTML = `
              <img src="https://i.imgur.com/WUkWpPb.png" alt="PoWoo Coin" style="width:32px;height:32px;filter:drop-shadow(0 0 8px #fff) drop-shadow(0 0 16px #26e0ce);border-radius:50%;background:#fff2;">
              <span style="font-size:1em;font-weight:bold;text-shadow:0 1px 6px #000,0 0 2px #000,0 0 1px #000;">+${amount} PoWoo Coin</span>
          `;
          document.body.appendChild(notification);
          // Animation : descend de 1.5cm, attend, puis remonte de 3cm au-dessus de la base, le tout lentement (7s)
          notification.animate([
              { opacity: 0, transform: `translate(-50%, ${baseOffset}px) scale(0.7)`, filter: 'blur(8px)' },
              { opacity: 1, transform: `translate(-50%, ${deepOffset}px) scale(1.12)`, filter: 'blur(0px)' },
              { opacity: 1, transform: `translate(-50%, ${deepOffset}px) scale(1.12)`, filter: 'blur(0px)' },
              { offset: 0.6, opacity: 1, transform: `translate(-50%, ${deepOffset}px) scale(1.12)`, filter: 'blur(0px)' },
              { offset: 0.8, opacity: 1, transform: `translate(-50%, ${upOffset}px) scale(1)`, filter: 'blur(0px)' },
              { opacity: 0, transform: `translate(-50%, ${upOffset}px) scale(0.7)`, filter: 'blur(8px)' }
          ], {
              duration: 7000,
              easing: 'cubic-bezier(.4,1.4,.6,1)',
              fill: 'forwards'
          });
          setTimeout(() => {
              notification.remove();
          }, 7000);
      }

      // === Ornement flammes dans la colonne Assigné à ===
      function applyOrnamentToAssigneeColumn() {
        document.querySelectorAll('.o_data_cell[name="user_id"]').forEach(cell => {
          const nameSpan = cell.querySelector('span, div, a') || cell;
          if (!nameSpan) return;
          const userName = nameSpan.textContent.trim();
          if (!userName) return;
          if (cell.classList.contains('ornament-applied')) return;
          cell.classList.add('ornament-applied');
          firebase.database().ref('users/' + encodeURIComponent(userName)).once('value').then(snapshot => {
            const user = snapshot.val() || {};
            if (user.selectedOrnament === 'dieu_flamme') {
              // Crée le conteneur principal (pour positionner le gif autour de tout)
              const mainWrapper = document.createElement('span');
              mainWrapper.style.position = 'relative';
              mainWrapper.style.display = 'flex';
              mainWrapper.style.alignItems = 'center';
              mainWrapper.style.justifyContent = 'flex-start';
              mainWrapper.style.width = 'auto';
              mainWrapper.style.minWidth = '160px';
              mainWrapper.style.maxWidth = '100%';
              mainWrapper.style.height = '56px';
              // Ajoute le GIF de flammes animé en fond
              const flamesBg = document.createElement('img');
              flamesBg.src = 'https://cdn.pixabay.com/animation/2024/05/07/23/55/23-55-47-279_256.gif';
              flamesBg.alt = 'Flammes animées';
              flamesBg.style.position = 'absolute';
              flamesBg.style.left = '0';
              flamesBg.style.top = '50%';
              flamesBg.style.transform = 'translateY(-50%)';
              flamesBg.style.width = '100%';
              flamesBg.style.height = '100%';
              flamesBg.style.pointerEvents = 'none';
              flamesBg.style.zIndex = '0';
              flamesBg.style.opacity = '0.7';
              // Conteneur ornement + photo
              const wrapper = document.createElement('span');
              wrapper.style.position = 'relative';
              wrapper.style.display = 'inline-block';
              wrapper.style.width = '56px';
              wrapper.style.height = '56px';
              wrapper.style.verticalAlign = 'middle';
              // Ajoute l'ornement PNG
              const flames = document.createElement('img');
              flames.src = 'https://i.imgur.com/ZdQCAkg.png';
              flames.alt = 'Ornement Dieu des appels';
              flames.style.position = 'absolute';
              flames.style.left = '50%';
              flames.style.top = '43%';
              flames.style.transform = 'translate(-50%,-50%)';
              flames.style.width = '56px';
              flames.style.height = '56px';
              flames.style.pointerEvents = 'none';
              flames.style.zIndex = '1';
              // Cherche la photo de profil Odoo
              let avatarImg = cell.querySelector('img');
              let avatar;
              if (avatarImg && avatarImg.src) {
                avatar = document.createElement('img');
                avatar.src = avatarImg.src;
                avatar.alt = userName;
                avatar.style.width = '26px';
                avatar.style.height = '26px';
                avatar.style.borderRadius = '50%';
                avatar.style.objectFit = 'cover';
                avatar.style.position = 'absolute';
                avatar.style.left = '50%';
                avatar.style.top = '46%';
                avatar.style.transform = 'translate(-50%,-50%)';
                avatar.style.zIndex = '2';
                avatar.style.border = '2px solid #fff8';
                avatar.style.background = '#23272f';
              } else {
                avatar = document.createElement('span');
                avatar.style.display = 'flex';
                avatar.style.alignItems = 'center';
                avatar.style.justifyContent = 'center';
                avatar.style.width = '26px';
                avatar.style.height = '26px';
                avatar.style.borderRadius = '50%';
                avatar.style.background = '#23272f';
                avatar.style.position = 'absolute';
                avatar.style.left = '50%';
                avatar.style.top = '46%';
                avatar.style.transform = 'translate(-50%,-50%)';
                avatar.style.zIndex = '2';
                avatar.style.fontWeight = 'bold';
                avatar.style.fontSize = '1.1em';
                avatar.style.color = '#fff';
                avatar.textContent = userName[0] || '';
              }
              wrapper.appendChild(flames);
              wrapper.appendChild(avatar);
              // Effet flammes sur le nom
              const nameFlame = document.createElement('span');
              nameFlame.textContent = ' ' + userName;
              nameFlame.className = 'flame-name';
              nameFlame.style.fontWeight = 'bold';
              nameFlame.style.fontSize = '1.08em';
              nameFlame.style.position = 'relative';
              nameFlame.style.background = 'linear-gradient(90deg,#ff9800,#ffd700,#fff,#ffd700,#ff9800)';
              nameFlame.style.backgroundSize = '200% 100%';
              nameFlame.style.backgroundClip = 'text';
              nameFlame.style.webkitBackgroundClip = 'text';
              nameFlame.style.color = 'transparent';
              nameFlame.style.webkitTextFillColor = 'transparent';
              nameFlame.style.animation = 'flameTextAnim 2s linear infinite alternate';
              nameFlame.style.textShadow = '0 0 16px #ff9800,0 0 32px #ffd700,0 0 12px #fff';
              // Construction finale
              mainWrapper.style.marginLeft = '0.2cm';
              nameFlame.style.marginLeft = '12px';
              nameFlame.style.whiteSpace = 'nowrap';
              nameFlame.style.overflow = 'visible';
              nameFlame.style.textOverflow = 'unset';
              nameFlame.style.maxWidth = 'unset';
              mainWrapper.appendChild(flamesBg);
              mainWrapper.appendChild(wrapper);
              mainWrapper.appendChild(nameFlame);
              cell.innerHTML = '';
              cell.appendChild(mainWrapper);
            }
            // === MAITRE DES APPELS (éclair) ===
            if (user.selectedOrnament === 'maitre_eclair') {
              // Conteneur principal
              const mainWrapper = document.createElement('span');
              mainWrapper.style.position = 'relative';
              mainWrapper.style.display = 'flex';
              mainWrapper.style.alignItems = 'center';
              mainWrapper.style.justifyContent = 'flex-start';
              mainWrapper.style.width = 'auto';
              mainWrapper.style.minWidth = '160px';
              mainWrapper.style.maxWidth = '100%';
              mainWrapper.style.height = '56px';
              // GIF d'éclair violet en fond
              const thunderBg = document.createElement('img');
              thunderBg.src = 'https://cdn.pixabay.com/animation/2025/01/22/22/52/22-52-40-118_256.gif';
              thunderBg.alt = 'Eclair animé';
              thunderBg.style.position = 'absolute';
              thunderBg.style.left = '0';
              thunderBg.style.top = '50%';
              thunderBg.style.transform = 'translateY(-50%)';
              thunderBg.style.width = '100%';
              thunderBg.style.height = '100%';
              thunderBg.style.pointerEvents = 'none';
              thunderBg.style.zIndex = '0';
              thunderBg.style.opacity = '0.7';
              // Ornement PNG autour de la photo
              const wrapper = document.createElement('span');
              wrapper.style.position = 'relative';
              wrapper.style.display = 'inline-block';
              wrapper.style.width = '56px';
              wrapper.style.height = '56px';
              wrapper.style.verticalAlign = 'middle';
              const thunderOrn = document.createElement('img');
              thunderOrn.src = 'https://i.imgur.com/sKtiPmj.png';
              thunderOrn.alt = 'Ornement Maître des appels';
              thunderOrn.style.position = 'absolute';
              thunderOrn.style.left = '50%';
              thunderOrn.style.top = '43%';
              thunderOrn.style.transform = 'translate(-50%,-50%)';
              thunderOrn.style.width = '56px';
              thunderOrn.style.height = '56px';
              thunderOrn.style.pointerEvents = 'none';
              thunderOrn.style.zIndex = '1';
              // Photo de profil centrée
              let avatarImg = cell.querySelector('img');
              let avatar;
              if (avatarImg && avatarImg.src) {
                avatar = document.createElement('img');
                avatar.src = avatarImg.src;
                avatar.alt = userName;
                avatar.style.width = '30px';
                avatar.style.height = '30px';
                avatar.style.borderRadius = '50%';
                avatar.style.objectFit = 'cover';
                avatar.style.position = 'absolute';
                avatar.style.left = '50%';
                avatar.style.top = '49%';
                avatar.style.transform = 'translate(-50%,-50%)';
                avatar.style.zIndex = '2';
                avatar.style.border = '2px solid #fff8';
                avatar.style.background = '#23272f';
              } else {
                avatar = document.createElement('span');
                avatar.style.display = 'flex';
                avatar.style.alignItems = 'center';
                avatar.style.justifyContent = 'center';
                avatar.style.width = '30px';
                avatar.style.height = '30px';
                avatar.style.borderRadius = '50%';
                avatar.style.background = '#23272f';
                avatar.style.position = 'absolute';
                avatar.style.left = '50%';
                avatar.style.top = '49%';
                avatar.style.transform = 'translate(-50%,-50%)';
                avatar.style.zIndex = '2';
                avatar.style.fontWeight = 'bold';
                avatar.style.fontSize = '1.1em';
                avatar.style.color = '#fff';
                avatar.textContent = userName[0] || '';
              }
              wrapper.appendChild(thunderOrn);
              wrapper.appendChild(avatar);
              // Effet éclair violet sur le nom
              const nameThunder = document.createElement('span');
              nameThunder.textContent = ' ' + userName;
              nameThunder.className = 'thunder-name';
              nameThunder.style.fontWeight = 'bold';
              nameThunder.style.fontSize = '1.08em';
              nameThunder.style.position = 'relative';
              nameThunder.style.background = 'linear-gradient(90deg,#8f00ff,#00eaff,#fff,#00eaff,#8f00ff)';
              nameThunder.style.backgroundSize = '200% 100%';
              nameThunder.style.backgroundClip = 'text';
              nameThunder.style.webkitBackgroundClip = 'text';
              nameThunder.style.color = 'transparent';
              nameThunder.style.webkitTextFillColor = 'transparent';
              nameThunder.style.animation = 'thunderTextAnim 2s linear infinite alternate';
              nameThunder.style.textShadow = '0 0 16px #8f00ff,0 0 32px #00eaff,0 0 12px #fff';
              // Construction finale
              mainWrapper.style.marginLeft = '0.2cm';
              nameThunder.style.marginLeft = '12px';
              nameThunder.style.whiteSpace = 'nowrap';
              nameThunder.style.overflow = 'visible';
              nameThunder.style.textOverflow = 'unset';
              nameThunder.style.maxWidth = 'unset';
              mainWrapper.appendChild(thunderBg);
              mainWrapper.appendChild(wrapper);
              mainWrapper.appendChild(nameThunder);
              cell.innerHTML = '';
              cell.appendChild(mainWrapper);
            }
            if (user.selectedOrnament === 'diamant') {
              // Conteneur principal
              const mainWrapper = document.createElement('span');
              mainWrapper.style.position = 'relative';
              mainWrapper.style.display = 'flex';
              mainWrapper.style.alignItems = 'center';
              mainWrapper.style.justifyContent = 'flex-start';
              mainWrapper.style.width = 'auto';
              mainWrapper.style.minWidth = '160px';
              mainWrapper.style.maxWidth = '100%';
              mainWrapper.style.height = '56px';
              // Ornement PNG autour de la photo
              const wrapper = document.createElement('span');
              wrapper.style.position = 'relative';
              wrapper.style.display = 'inline-block';
              wrapper.style.width = '56px';
              wrapper.style.height = '56px';
              wrapper.style.verticalAlign = 'middle';
              const diamondOrn = document.createElement('img');
              diamondOrn.src = 'https://i.imgur.com/JLyduRZ.png';
              diamondOrn.alt = 'Ornement Diamant';
              diamondOrn.style.position = 'absolute';
              diamondOrn.style.left = '50%';
              diamondOrn.style.top = '43%';
              diamondOrn.style.transform = 'translate(-50%,-50%)';
              diamondOrn.style.width = '56px';
              diamondOrn.style.height = '56px';
              diamondOrn.style.pointerEvents = 'none';
              diamondOrn.style.zIndex = '1';
              // Photo de profil centrée
              let avatarImg = cell.querySelector('img');
              let avatar;
              if (avatarImg && avatarImg.src) {
                avatar = document.createElement('img');
                avatar.src = avatarImg.src;
                avatar.alt = userName;
                avatar.style.width = '30px';
                avatar.style.height = '30px';
                avatar.style.borderRadius = '50%';
                avatar.style.objectFit = 'cover';
                avatar.style.position = 'absolute';
                avatar.style.left = '50%';
                avatar.style.top = '49%';
                avatar.style.transform = 'translate(-50%,-50%)';
                avatar.style.zIndex = '2';
                avatar.style.border = '2px solid #fff8';
                avatar.style.background = '#23272f';
              } else {
                avatar = document.createElement('span');
                avatar.style.display = 'flex';
                avatar.style.alignItems = 'center';
                avatar.style.justifyContent = 'center';
                avatar.style.width = '30px';
                avatar.style.height = '30px';
                avatar.style.borderRadius = '50%';
                avatar.style.background = '#23272f';
                avatar.style.position = 'absolute';
                avatar.style.left = '50%';
                avatar.style.top = '49%';
                avatar.style.transform = 'translate(-50%,-50%)';
                avatar.style.zIndex = '2';
                avatar.style.fontWeight = 'bold';
                avatar.style.fontSize = '1.1em';
                avatar.style.color = '#fff';
                avatar.textContent = userName[0] || '';
              }
              wrapper.appendChild(diamondOrn);
              wrapper.appendChild(avatar);
              // Effet texte bleu scintillant
              const nameDiamond = document.createElement('span');
              nameDiamond.textContent = ' ' + userName;
              nameDiamond.className = 'diamond-name';
              nameDiamond.style.fontWeight = 'bold';
              nameDiamond.style.fontSize = '1.08em';
              nameDiamond.style.position = 'relative';
              nameDiamond.style.background = 'linear-gradient(90deg,#00eaff,#00bfff,#fff,#00bfff,#00eaff)';
              nameDiamond.style.backgroundSize = '200% 100%';
              nameDiamond.style.backgroundClip = 'text';
              nameDiamond.style.webkitBackgroundClip = 'text';
              nameDiamond.style.color = 'transparent';
              nameDiamond.style.webkitTextFillColor = 'transparent';
              nameDiamond.style.animation = 'diamondTextAnim 2s linear infinite alternate';
              nameDiamond.style.textShadow = '0 0 12px #00eaff,0 0 24px #00bfff,0 0 8px #fff';
              nameDiamond.style.marginLeft = '12px';
              nameDiamond.style.whiteSpace = 'nowrap';
              nameDiamond.style.overflow = 'visible';
              nameDiamond.style.textOverflow = 'unset';
              nameDiamond.style.maxWidth = 'unset';
              // Ajoute le GIF diamant à droite du texte
              const sparkle = document.createElement('img');
              sparkle.src = 'https://cdn.pixabay.com/animation/2024/02/22/14/55/14-55-54-406_256.gif';
              sparkle.alt = 'Diamant animé';
              sparkle.style.display = 'inline-block';
              sparkle.style.width = '32px';
              sparkle.style.height = '32px';
              sparkle.style.marginLeft = '2px';
              sparkle.style.verticalAlign = 'middle';
              sparkle.style.opacity = '0.85';
              nameDiamond.appendChild(sparkle);
              // Construction finale
              mainWrapper.style.marginLeft = '0.2cm';
              nameDiamond.style.marginLeft = '12px';
              mainWrapper.appendChild(wrapper);
              mainWrapper.appendChild(nameDiamond);
              cell.innerHTML = '';
              cell.appendChild(mainWrapper);
            }
            if (user.selectedOrnament === 'platine') {
              // Conteneur principal
              const mainWrapper = document.createElement('span');
              mainWrapper.style.position = 'relative';
              mainWrapper.style.display = 'flex';
              mainWrapper.style.alignItems = 'center';
              mainWrapper.style.justifyContent = 'flex-start';
              mainWrapper.style.width = 'auto';
              mainWrapper.style.minWidth = '160px';
              mainWrapper.style.maxWidth = '100%';
              mainWrapper.style.height = '56px';
              // Ornement PNG autour de la photo
              const wrapper = document.createElement('span');
              wrapper.style.position = 'relative';
              wrapper.style.display = 'inline-block';
              wrapper.style.width = '56px';
              wrapper.style.height = '56px';
              wrapper.style.verticalAlign = 'middle';
              const platineOrn = document.createElement('img');
              platineOrn.src = 'https://i.imgur.com/2gpOrLT.png';
              platineOrn.alt = 'Ornement Platine';
              platineOrn.style.position = 'absolute';
              platineOrn.style.left = '50%';
              platineOrn.style.top = '43%';
              platineOrn.style.transform = 'translate(-50%,-50%)';
              platineOrn.style.width = '56px';
              platineOrn.style.height = '56px';
              platineOrn.style.pointerEvents = 'none';
              platineOrn.style.zIndex = '1';
              // Photo de profil centrée
              let avatarImg = cell.querySelector('img');
              let avatar;
              if (avatarImg && avatarImg.src) {
                avatar = document.createElement('img');
                avatar.src = avatarImg.src;
                avatar.alt = userName;
                avatar.style.width = '30px';
                avatar.style.height = '30px';
                avatar.style.borderRadius = '50%';
                avatar.style.objectFit = 'cover';
                avatar.style.position = 'absolute';
                avatar.style.left = '50%';
                avatar.style.top = '49%';
                avatar.style.transform = 'translate(-50%,-50%)';
                avatar.style.zIndex = '2';
                avatar.style.border = '2px solid #fff8';
                avatar.style.background = '#23272f';
              } else {
                avatar = document.createElement('span');
                avatar.style.display = 'flex';
                avatar.style.alignItems = 'center';
                avatar.style.justifyContent = 'center';
                avatar.style.width = '30px';
                avatar.style.height = '30px';
                avatar.style.borderRadius = '50%';
                avatar.style.background = '#23272f';
                avatar.style.position = 'absolute';
                avatar.style.left = '50%';
                avatar.style.top = '49%';
                avatar.style.transform = 'translate(-50%,-50%)';
                avatar.style.zIndex = '2';
                avatar.style.fontWeight = 'bold';
                avatar.style.fontSize = '1.1em';
                avatar.style.color = '#fff';
                avatar.textContent = userName[0] || '';
              }
              wrapper.appendChild(platineOrn);
              wrapper.appendChild(avatar);
              // Effet texte bleu ciel glow
              const namePlatine = document.createElement('span');
              namePlatine.textContent = ' ' + userName;
              namePlatine.className = 'platine-name';
              namePlatine.style.fontWeight = 'bold';
              namePlatine.style.fontSize = '1.08em';
              namePlatine.style.position = 'relative';
              namePlatine.style.color = '#7ed6df';
              namePlatine.style.textShadow = '0 0 8px #7ed6df, 0 0 16px #fff';
              namePlatine.style.marginLeft = '12px';
              namePlatine.style.whiteSpace = 'nowrap';
              namePlatine.style.overflow = 'visible';
              namePlatine.style.textOverflow = 'unset';
              namePlatine.style.maxWidth = 'unset';
              // Construction finale
              mainWrapper.style.marginLeft = '0.2cm';
              namePlatine.style.marginLeft = '12px';
              mainWrapper.appendChild(wrapper);
              mainWrapper.appendChild(namePlatine);
              cell.innerHTML = '';
              cell.appendChild(mainWrapper);
            }
          });
        });
      }
      // Ajoute l'animation CSS globale une seule fois
      if (!document.getElementById('flame-anim-style')) {
        const style = document.createElement('style');
        style.id = 'flame-anim-style';
        style.innerHTML = `@keyframes flameTextAnim {0%{background-position:0% 50%;}100%{background-position:100% 50%;}}`;
        document.head.appendChild(style);
      }
      // Observe le DOM pour appliquer dynamiquement l'effet
      const assigneeObserver = new MutationObserver(applyOrnamentToAssigneeColumn);
      assigneeObserver.observe(document.body, { childList: true, subtree: true });
      // Appel initial
      applyOrnamentToAssigneeColumn();
      // Ajoute l'animation CSS pour le texte éclair si pas déjà présent
      if (!document.getElementById('thunder-anim-style')) {
        const style = document.createElement('style');
        style.id = 'thunder-anim-style';
        style.innerHTML = `@keyframes thunderTextAnim {0%{background-position:0% 50%;}100%{background-position:100% 50%;}}`;
        document.head.appendChild(style);
      }
      if (!document.getElementById('diamond-anim-style')) {
        const style = document.createElement('style');
        style.id = 'diamond-anim-style';
        style.innerHTML = `@keyframes diamondTextAnim {0%{background-position:0% 50%;}100%{background-position:100% 50%;}}`;
        document.head.appendChild(style);
      }
  }
})();

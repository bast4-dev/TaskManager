# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier
(bugs corrigés, failles de sécurité, améliorations) dans le cadre de l'évaluation
« Mise en production et maintenance applicative » (E27, E28, E29).

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/).

## [Non publié]

### Ajouté (E24, E25)

- **Conteneurisation de l'application (E24)** : `Dockerfile` pour le backend (Node 22),
  `Dockerfile` multi-étapes pour le frontend (build React puis service par Nginx), et un `docker-compose.yml` orchestrant frontend, backend et MongoDB.
  - MongoDB n'est pas exposé sur l'hôte (accessible seulement en interne) et ses données sont conservées dans un volume Docker.
  - Ajout des `.dockerignore` et d'un `nginx.conf` (avec repli `try_files` pour les routes du SPA React).

- **Journalisation avec Winston (E25)** : module de log centralisé
  (`backend/config/logger.js`) qui remplace tous les `console.log`/`console.error`.
  - Sortie au format JSON structuré (horodatage, niveau, service), vers la console (`stdout`) et deux fichiers (`logs/error.log`, `logs/combined.log`).
  - Journalisation des requêtes HTTP via `morgan`, redirigée dans Winston.

### Documentation (E29)

- **Documentation du code source avec JSDoc.** Ajout de blocs `/** */` sur les 6 routes
  de l'API (`auth.js` : register, login ; `tasks.js` : GET, POST, PUT, DELETE) et sur le
  composant React `Tasks` (`frontend/src/pages/Tasks.js`).
- **Génération d'une documentation HTML** à partir du code source via `jsdoc`
  (configuration `backend/jsdoc.json`, sortie dans `backend/docs/`).
- Ce fichier `CHANGELOG.md` tient lieu de journal des évolutions.

### Déploiement & CI/CD (E21–E24)

- **Pipeline CI/CD GitHub Actions (E24)** : workflow `.github/workflows/ci.yml` déclenché
  à chaque push/PR sur `main`. Trois jobs : installation + `npm audit` du backend,
  installation + build + `npm audit` du frontend, et build des deux images Docker.
- **URL d'API configurable selon l'environnement (E21)** : `frontend/src/api.js` lit
  désormais `REACT_APP_API_URL` (repli sur `localhost:5000` en développement), pour
  pointer vers le bon backend en dev / pré-prod / production.
- **Hébergement cloud (E21, E22)** : backend déployé en **Web Service Docker** et frontend
  en **Static Site** sur **Render** ; base de données sur **MongoDB Atlas** (cluster gratuit).
  Secrets (`MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL`, `REACT_APP_API_URL`) gérés via les
  variables d'environnement de Render, jamais dans le code.
- **HTTPS (E23)** : certificats TLS automatiques (Let's Encrypt) fournis par Render sur les
  deux services. Règle de réécriture `/* → /index.html` sur le Static Site pour le routing SPA.

### Améliorations (E27)

Fonctionnalités absentes repérées lors des tests (jamais implémentées dans le code
d'origine — des manques, pas des bugs).

**Réalisées :**
- **Voir le détail d'une tâche** : clic sur le titre pour déplier et afficher sa
  `description` (`frontend/src/pages/Tasks.js`).
- **Marquer une tâche comme « terminée »** : case à cocher qui bascule `isCompleted`
  via `PUT /api/tasks/:id` et met à jour la liste.
- **Champ description à la création** : ajout d'un champ description dans le formulaire
  (`frontend/src/components/TaskForm.js`), envoyé à l'API.

- **Modifier une tâche** : bouton « Modifier » permettant d'éditer le titre et la
  description d'une tâche existante, enregistré via `PUT /api/tasks/:id`.

### Corrigé (E27)

- **Page d'inscription inaccessible depuis l'interface.** La route `/register` et le composant `Register` existaient, mais aucun lien de l'UI n'y menait : on n'avait accès qu'à la page de connexion.
  - Ajout d'un lien « Inscription » dans la barre de navigation (`Header.js`),
    d'un lien « Inscrivez-vous » sous le formulaire de connexion (`Login.js`),
    et d'un lien retour « Connectez-vous » sur la page d'inscription (`Register.js`).

- **Aucun message d'erreur en cas d'échec de connexion.** Si l'utilisateur se trompait d'identifiants, rien ne s'affichait à l'écran (`frontend/src/pages/Login.js`).
  - **Avant :** l'erreur était seulement envoyée dans la console (`console.error`) ; l'utilisateur n'avait aucun retour visuel.
  - **Après :** ajout d'un état `error` affiché dans une bannière rouge sous le titre, reprenant le message renvoyé par l'API (« Identifiants incorrects ») ou un message par défaut.

- **Aucun retour visuel en cas d'échec d'inscription.** Même problème que la connexion, mais sur la page d'inscription (`frontend/src/pages/Register.js`).
  - **Avant :** l'erreur n'était envoyée que dans la console.
  - **Après :** ajout du même état `error` et de la bannière rouge, affichant le message de l'API (ex. règle de mot de passe non respectée) ou un message par défaut.

- **La nouvelle tâche n'apparaissait pas sans rafraîchir la page.** Après la création d'une tâche, l'interface ne se mettait pas à jour (`frontend/src/pages/Tasks.js`).
  - **Avant :** la fonction `addTask` était vide, donc le state React n'était jamais modifié après l'ajout ; il fallait recharger la page pour voir la tâche.
  - **Après :** `addTask` insère la nouvelle tâche en tête du state
    (`setTasks([task, ...tasks])`), ce qui déclenche un re-render immédiat.

- **Les tâches restaient visibles après déconnexion (route non protégée).** La page
  `/tasks` s'affichait même sans être connecté (`frontend/src/App.js`).
  - **Avant :** `<Route path="/tasks" element={<Tasks />} />` sans condition ; après déconnexion, le composant restait monté avec ses données à l'écran.
  - **Après :** la route est conditionnée à l'authentification et redirige vers `/login` si l'utilisateur n'est pas connecté.

### Sécurité (E28)

- **Validation des entrées utilisateur avec Joi** sur l'inscription, la connexion et la création de tâche (`backend/routes/auth.js`, `backend/routes/tasks.js`).
  - **Avant :** un mot de passe vide ou d'un seul caractère, un username trop court, ou une tâche sans titre étaient acceptés et enregistrés en base.
  - **Après :** chaque route valide le `req.body` contre un schéma Joi avant tout traitement (username 3–30 caractères, titre de tâche obligatoire) et renvoie :
    **HTTP 400** si les données ne sont pas conformes.
  - **Politique de mot de passe renforcée** (extension `joi-password`) : minimum
    **12 caractères**, au moins une majuscule, une minuscule, un chiffre, un caractère spécial, et pas d'espace (aligné sur les recommandations ANSSI).
  - **Messages d'erreur en français et harmonisés** : personnalisation des messages Joi (`.messages()`) et des réponses de connexion (« Identifiants incorrects ») pour un retour utilisateur cohérent et lisible.

- **Correction d'une faille IDOR (Insecure Direct Object Reference)** sur les routes
  `PUT /api/tasks/:id` et `DELETE /api/tasks/:id`
  (`backend/routes/tasks.js`).
  - **Avant :** tout utilisateur authentifié pouvait modifier ou supprimer la tâche de n'importe quel autre utilisateur en connaissant son identifiant, car aucune vérification de propriété n'était faite.
  - **Après :** on compare le propriétaire de la tâche (`task.user`) à l'utilisateur du token (`req.user.id`) et on renvoie **HTTP 403** si ce n'est pas le même.

- **Secret JWT renforcé et sorti du versionnement** (`backend/.env`, `backend/server.js`).
  - **Avant :** `JWT_SECRET=secretkey123`, trop simple à deviner par force brute, ce qui permettait à un attaquant de concevoir des tokens valides.
  - **Après :** secret aléatoire de 48 octets (96 caractères hex). Ajout d'un `.gitignore` (le `.env` n'est plus versionné) et d'un `.env.example` documentant les variables sans les valeurs.

- **Configuration CORS restreinte** (`backend/server.js`).
  - **Avant :** `app.use(cors())` autorisait toutes les origines à appeler l'API.
  - **Après :** l'API n'accepte que l'origine du frontend, définie par la variable d'environnement `FRONTEND_URL`.

- **Protection contre les injections XSS** sur les tâches (`backend/routes/tasks.js`).
  - **Avant :** le titre et la description étaient enregistrés bruts ; un contenu comme `<script>…</script>` était stocké tel quel en base (REACT faisait déjà l'échappement automatiquement, mais c'est mieux de ne pas stocker des balises script en base).
  - **Après :** nettoyage des entrées avec la biblio `sanitize-html` (suppression de toute balise) avant enregistrement, en complément de l'échappement automatique de React à l'affichage.

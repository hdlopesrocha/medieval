# Copilot Instructions for Tocabola Project

## Project Overview

Tocabola is a turn-based card game implemented with Vue.js, TypeScript, and Vite. The project features a multiplayer mode using WebRTC QR code exchange, a game engine for card and player management, and a modern UI built with Ionic components. The codebase is organized for modularity and clarity, supporting both local and networked play.

## Folder Structure

- **src/**: Main source code
  - **components/**: Vue components for UI (CardItem, MiniCardItem, ModalCard, etc.)
  - **game/**: Game engine logic (GameEngine, CardHandler, commands)
  - **models/**: Data models (Card, Player, Deck, GameContext, GameWorkflowState)
  - **services/**: Application services (deckService, eventService, webrtcQrService)
  - **utils/**: Utility functions (asset, sortCardsInPlay)
  - **views/**: Page-level Vue components (CardViewer, HistoryPage, LocalPlayerPage, MapPage, SharePage)
  - **assets/**: Static assets (images, icons)
  - **data/**: Sample decks and card data
- **index.html**: Main entry point
- **package.json**: Project dependencies and scripts
- **tsconfig.json**: TypeScript configuration
- **vite.config.js**: Vite build configuration
- **cards.csv**: Card data in CSV format

## Key Concepts

- **GameEngine**: Central class managing game state, player turns, card actions, and persistence.
- **Player Model**: Each player has an `id`, `name`, `hand` (array of card IDs), `castleHp`, and `played` (array of CardPosition objects).
- **Card Model**: Cards are defined with unique IDs and properties, loaded from CSV or sampleDeck.
- **GameContext**: Stores deck, player list, current player, and actions by player.
- **GameWorkflowState**: Tracks game progress, history, active player, and round.
- **Views**: Pages like CardViewer, LocalPlayerPage, and MapPage provide interactive interfaces for gameplay, history, and map visualization.
- **WebRTC QR Service**: Enables multiplayer by exchanging game state via QR codes and peer-to-peer connections.

## Coding Guidelines

- Use TypeScript for all logic and models.
- Use Vue 3 composition API for component logic.
- Prefer modular, reusable components for UI.
- Use the `played` property for cards in play (not `cardsInPlay`).
- Use eventService for state change notifications.
- Persist game state using localStorage via GameContext and GameWorkflowState.
- Use utility functions for sorting and asset management.

## Commit & Refactor Practices

- Group related changes into logical commits with detailed descriptions.
- Refactor legacy properties (e.g., `cardsInPlay` → `played`) across all affected files.
- Remove compatibility aliases and unused code.
- Update UI and computed properties to match new data structures.
- Test multiplayer and local modes after major refactors.

## Common Tasks

- **Add a new card**: Update `sampleDeck.ts`, then ensure Deck and Card models support new properties.
- **Add a new view/page**: Create a Vue component in `views/`, register in router, and use Ionic components for layout.
- **Update game logic**: Modify `GameEngine.ts` and related models/services, update UI as needed.
- **Fix UI bugs**: Edit relevant component in `components/` or `views/`, test changes in both local and multiplayer modes.

## Testing & Running

- Use `npm run dev` to start the development server.
- Test in multiple browsers for WebRTC and QR functionality.
- Use browser dev tools for debugging Vue and network issues.

## Advanced Features

- **Multiplayer**: Uses QR code exchange and WebRTC for peer-to-peer game state sync.
- **History Tracking**: GameWorkflowState records actions, rounds, and player HP for review.
- **Map Visualization**: MapPage displays card positions and zones, supports card actions (move, attack, convert).

## Copilot Usage Tips

- When refactoring, search for all usages of a property or method before making changes.
- Use detailed commit messages for each logical change.
- Prefer batch staging and committing for large refactors.
- Always update both UI and engine logic when changing data structures.
- Use the provided utility functions and services for common tasks.

## Contribution & Maintenance

- Follow modular design and keep code DRY.
- Document new features and refactors in README.md and copilot-instructions.md.
- Review and test changes before committing.
- Use GitHub issues and PRs for tracking bugs and features.

---

This guide is intended for developers and Copilot users working on the Tocabola project. For further details, see README.md and inline code comments.
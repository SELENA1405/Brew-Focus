# ☕ Brew & Focus

Brew & Focus is a cozy café-themed productivity web application that makes studying more enjoyable.

Instead of using a traditional Pomodoro timer, users create a custom drink before starting a focus session. As the timer progresses, the drink gradually empties, providing a visual representation of study progress.

The project was designed with a warm, nostalgic café aesthetic inspired by vintage coffee shops, recipe books, and relaxing study environments.

---

## ✨ Features

### ☕ Custom Drink Creation

* Create your own virtual café drink
* Mix ingredients to build unique beverages
* Watch your drink empty as you study

### ⏳ Focus Timer

* Pomodoro-inspired study timer
* Visual progress through drink consumption
* Helps encourage focused study sessions

### 📖 Interactive Recipe Book

* View created drink recipes
* Realistic book-style interface
* Page-flipping animations and sound effects

### 🫖 Study Café

* Open your own café and choose its atmosphere: Parisian Café, Rainy Bookstore, Kyoto Tea House, Midnight Jazz Café, Library Reading Room or Beach Café
* Invite friends with a link, a six-letter code, or their username
* Step inside and sit at one shared table — brew your own drink or order from the café's menu
* Study together on one shared timer kept by the host; everyone's drink empties together
* Finished sessions are saved to Shared Brews in your recipe book

### 🎵 Background Music

* A gramophone in the corner chooses the music: the original café song, or a playlist for each café atmosphere
* "Match the café" (the default) plays each Study Café room's own music
* Volume, next song, and on/off

### 🎨 Cozy User Interface

* Vintage-inspired design
* Warm brown, burgundy, cream, and beige color palette
* Café-themed visuals and interactions

---

## 🛠 Technologies Used

* HTML5
* CSS3
* JavaScript (Vanilla JS)
* Local Storage
* Supabase (accounts, saved recipes, Study Café with realtime updates)

---

## 🚀 Running the Project

1. Clone the repository:

```bash
git clone https://github.com/yourusername/brew-and-focus.git
```

2. Open the project folder.

3. Launch:

```text
index.html
```

in your browser.

No installation is required to brew and study on your own.

### Study Café setup (once)

The Study Café stores cafés, seats and invitations in Supabase. To turn it on:

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the contents of `supabase/cafes.sql` and click **Run**.

That creates the café tables, the server functions for creating, joining, inviting and the shared timer, and the security rules that keep each café private to its members. It's safe to run again.

---

## 📂 Project Structure

```text
brew-and-focus/
│
├── index.html
├── style.css
├── script.js
├── supabase/
│   └── cafes.sql      (Study Café database setup)
│
├── assets/
│   ├── images/
│   ├── audio/
│   └── icons/
│
└── README.md
```

---

## 🌱 Future Improvements

Planned features include:

* User accounts
* Database integration
* Recipe saving across devices
* Study statistics and analytics
* Social study rooms
* Shared recipe collections
* Additional café themes
* More ambient audio options

---

## 🎶 Music Credits

The Parisian Café, Kyoto Tea House and Library Reading Room play free music by **Kevin MacLeod** ([incompetech.com](https://incompetech.com)), licensed under [Creative Commons: By Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). The files were converted to AAC to keep the site light; nothing else was changed.

| Café | Tracks |
|---|---|
| Parisian Café | "Parisian", "Avec Soin" |
| Kyoto Tea House | "Ishikari Lore", "Ripples" |
| Library Reading Room | "Gymnopedie No. 1" (Erik Satie), "Prelude in C, BWV 846" (J. S. Bach) |

Each: Kevin MacLeod (incompetech.com), Licensed under Creative Commons: By Attribution 4.0 License, http://creativecommons.org/licenses/by/4.0/

The Rainy Bookstore, Midnight Jazz Café and Beach Café music is composed live in the browser by the site itself, and the house "Café Records" song is the project's own.

---

## ⚠️ Image Credits

Some images used in this project were sourced from Pinterest for educational and demonstration purposes.

I do not own these images and do not claim ownership of any third-party visual assets used within this project. All rights belong to their respective creators and copyright holders.

If you are the owner of any image used in this project and would like it removed or credited differently, please contact me.

---

## 📚 Educational Project

This project was created as a learning and portfolio project to practice:

* Front-end web development
* JavaScript interactivity
* User interface design
* User experience design
* Creative productivity applications

---

Made with ☕ and 📖 for students who enjoy studying in cozy cafés.

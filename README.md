# Budget Buddy - My Final Project

Hey there! This is Budget Buddy, the expense tracker I've been working on for my final school project. I wanted to build something that didn't just track numbers but actually looked like an app I'd want to use every day.

## Why I built this
Managing money is tough, especially when you're a student. I noticed most apps were either too complicated or just plain ugly. I spent a lot of time on the UI to make it feel "premium" and smooth, using a mobile-first design that works great on my phone.

## What's inside
*   **Real-time sync:** I used Firebase for the backend, so whenever you add an expense, it's saved instantly.
*   **Clean Dashboard:** You get a quick look at your total spending and a trend chart to see how you're doing over the week.
*   **Transaction History:** A dedicated place to search through everything you've spent.
*   **Smart Analytics:** I added some charts to show which categories are eating up your budget.
*   **Auth:** Secure login and signup so your data stays yours.

## The Tech
I kept it modern:
*   **React** for the logic.
*   **Tailwind CSS** for all the styling (I love how fast it is to build layouts with this).
*   **Framer Motion** for those smooth transitions between screens.
*   **Firebase** for Authentication and Firestore (the database).
*   **Recharts** for the spending trend graphs.

## How to get it running
If you want to try it out locally:
1.  Clone the repo.
2.  Run `npm install` to get all the packages.
3.  You'll need a `firebase-applet-config.json` with your own Firebase keys.
4.  Run `npm run dev` and open it up at `localhost:3000`.

Hope you like it! It was a lot of work but I'm pretty happy with how the UI turned out.

## Car Tracker
https://railway.com/invite/mYgBmNTRK1z

This is a simple app I built to track a car collection. You can sign up (it's automatic), log in, and then add, edit, 
or delete your cars. It also shows you some basic stats about your collection.

- Goal: To make a full stack app where you could log in and manage a list of cars.

- Challenges: Figuring out how to get the front end and back-end to talk to each other without the page refreshing. 
- Also, getting the session-based login to work correctly took some time. I also initially had trouble with
- the MongoDB URI.

- Authentication: I just went with a standard session based login. When you log in (or create an account, it does 
- it automatically), the server gives you a cookie. The server then uses that cookie to remember who you are for 
- future requests.

- Styling: I used Bootstrap 5. It handles all the responsive stuff and gives you components like cards and modals.
- I wrote my own main.css file on top of it to change the colors and add a few tweaks to make it look a bit more unique.

Express Middleware:

express.json() / express.urlencoded(): Lets the server understand the data sent from the front end forms and API calls.

express.static(): Serves up all the static files

express-session: The core of the login system, keeps track of who is logged in

requireAuth (custom): A quick function to block pages if you're not logged in

Technical:

- Got a full CRUD API working with a MongoDB database.

- Built the login/session system from scratch with bcrypt for password hashing.

Design:

- The UI is simple and works well on both mobile and desktop. Easy to navigate with simple, non-contrasting
colors that greatly improves the accessibility of this web app, based on the W3C Web Accessibility Initiative

- The dashboard updates in real time when you add/edit/delete cars, so you don't have to reload the page

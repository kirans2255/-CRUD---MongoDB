const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');

mongoose.connect('mongodb://localhost:27017/datas');

const app = express();
const PORT = process.env.PORT || 2000;

app.use((req, res, next) => {
    res.header('Cache-Control', 'no-store, private, no-cache, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    next();
});

// Session middleware configuration
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    // Add session store configuration here if applicable
}));

app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String
}, { versionKey: false });

const User = mongoose.model('users', UserSchema);

app.set('view engine', 'ejs');


app.get('/', async (req, res) => {
    try {
        if (req.session.userDetails) {
            res.redirect('/dash');
        } else {
            res.render('login', { error: '' });
        }
    } catch (error) {
        console.log(error);
    }
});


app.post('/login', async (req, res) => {
    try {
        const { signInEmail, signInPassword } = req.body;
        const userData = await User.findOne({ email: signInEmail });
        req.session.userDetails = { email: userData.email, password: userData.password };

        if (!userData) {
            return res.render("login", { error: "User doesn't exist, You should sign up first", enteredEmail: signInEmail });
        }

        if (signInPassword !== userData.password) {
            return res.render("login", { error: "*Wrong password", enteredEmail: signInEmail });
        }
        res.redirect("/dash");
    } catch (error) {
        console.error("Unexpected error occurred: ", error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});

app.get('/signin', (req, res) => {
    res.render('signup', { error: '' });
});

app.get('/dash', async (req, res) => {
    try {
        if (!req.session.userDetails) {
            return res.redirect('/');
        }
        const user = await User.findOne({ email: req.session.userDetails.email });
        res.render('dashboard', { user: user });
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/submit', async (req, res) => {
    try {
        const { signupFullName, signupEmail, signupPassword } = req.body;
        const newUser = new User({ name: signupFullName, email: signupEmail, password: signupPassword });
        await newUser.save();
        req.session.userDetails = { name: newUser.name, email: newUser.email };
        res.redirect("/dash");
    } catch (error) {
        console.log("Error signing up", error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
});

app.get('/edit/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            res.render('editform', { user });
        } else {
            res.status(404).json({ error: 'user not found' });
        }
    } catch (error) {
        console.error('Error fetching user for edit:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.post('/update/:id', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Find the user by ID and update their details
        const updatedUser = await User.findByIdAndUpdate(req.params.id, {
            name: name,
            email: email,
            password: password
        }, { new: true }); // { new: true } ensures you get the updated user data back
        
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update the session details if necessary
        req.session.userDetails = { 
            name: updatedUser.name, 
            email: updatedUser.email,
            password: updatedUser.password // This ensures the session has the latest password
        };;
        
        res.redirect('/dash');
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.delete('/deleteall/:id', async (req, res) => {
    try {
        const deletion = await User.findByIdAndDelete(req.params.id);
        if (deletion) {
            req.session.destroy();
            return res.json({ success: true, message: "Account deleted successfully" });
        } else {
            return res.status(400).json({ success: false, message: "Error while account deletion" });
        }
    } catch (error) {
        console.error("Unexpected error occurred while deletion", error);
        res.status(500).json({ success: false, message: "Server error while deletion" });
    }
});

app.get('/logout', (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                res.status(500).json({ error: 'Internal Server Error' });
            } else {
                res.redirect('/');
            }
        });
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});





///end



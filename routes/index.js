var express = require('express');
var router = express.Router();
var app = express();
var mongoose = require('mongoose');
var bcrypt = require('bcrypt');

mongoose.connect('mongodb://localhost/Note20');

var userSchema = new mongoose.Schema({
	userName : String,
	eMail : String,
	passwordHash : String
});

var userModel = mongoose.model('users', userSchema);

var noteSchema = new mongoose.Schema({
	user : String,
	date: { type: Date, default: Date.now },
	color: Number,
	title : String,
	content: String

});

var noteModel = mongoose.model('notes', noteSchema);

/* GET home page. */
router.get('/login', function(req, res, next) {
	if(req.query.error == null) {res.render('login', { error: 0 });}
	else {res.render('login', { error: 1 });}
});

router.post('/login', (req, res) => {
	console.log('Login recu : ' + req.body.login);
	var query = userModel.find({userName: req.body.login});
	query.exec(function (err, dbuser) {
		if(err) {throw err;}
		if(!dbuser.length) {
			console.log('Utilisateur non trouve');
			res.redirect('/login?error=1');
		}
		else {
			bcrypt.compare(req.body.passwd, dbuser[0].passwordHash, function(err, loginResult) {
				if(loginResult) {
					sess = req.session;
					sess.user = dbuser[0].userName;
					res.redirect('/');
					console.log('Authentification reussie');
				}
				else {
					res.redirect('/login?error=1');
					console.log('Mauvais mot de passe');
				}
			});
		}
	});
});

router.get('/signup', function(req, res, next) {
	if(req.query.error == null) {res.render('signup', {error: 0});}
	else {res.render('signup', {error: 1});}
});

router.post('/signup', (req, res) => {
	var query = userModel.find({userName: req.body.login});
	query.exec(function (err, foundUsers) {
		if(err) {throw err;}
		//Vérification du nom d'utilisateur
		if(!foundUsers.length) {
		var hash = bcrypt.hashSync(req.body.passwd, 10);
		console.log("Nouvel utilisateur : ");
		console.log("userName : " + req.body.login);
		console.log("eMail : " + req.body.email);
		console.log("passwordHash : " + hash);
		var newUser = new userModel({
			userName : req.body.login,
			eMail: req.body.email,
			passwordHash: hash
		});
		newUser.save();	
		sess = req.session;
		sess.user = req.body.login;
		res.redirect('/');
	}
	else {
		console.log("Erreur : nom d'utilisateur deja utilise");
		res.redirect('/signup?error=1');
	}
	});
});

router.get('/', function(req, res, next) {
    var sess = req.session;
    if(!sess.user) {
        res.redirect('/login');
        res.end();
    }
    if(req.query.sort) {
    	console.log("changement de l'ordre de tri : " + req.query.sort);
    	sess.sort = req.query.sort;
    }
    else {sess.sort = 0;}
    if(sess.sort == 1) {var query = noteModel.find({user: sess.user}).sort({date: -1});}
    else if(sess.sort == 2) {var query = noteModel.find({user: sess.user}).sort({title: 1});}
    else {var query = noteModel.find({user: sess.user});}
    query.exec(function (err, notes) {
    	if(err) {throw err;}
    	res.render('dashboard', { notes: notes, user: sess.user , sort: sess.sort});
    });
});

router.get('/edit', function(req, res, next) {
	sess = req.session;
	if(!sess.user) {
		res.redirect('/login');
		res.end();
	}
	console.log('note id : ' +  req.query.note);
	var query = noteModel.findOne({_id: req.query.note});
	query.exec(function (err, note) {
		if(err) {throw err;}
		res.render('editor', {newNote: 0, note: note, user: sess.user});
	})
});

router.get('/delete', function(req, res, next) {
	sess = req.session;
	if(!sess.user) {
		res.redirect('/login');
		res.end();
	}
	noteModel.remove({_id: req.query.note}, function(err) {
		if (err) {throw err;}
		console.log('Suppression de la note : ' + req.query.note);
		res.redirect('/');
	});
})

router.get('/new', function(req, res, next) {
	sess = req.session;
	if(!sess.user) {
		res.redirect('/login');
		res.end();
	}
	res.render('editor', {newNote: 1, user: sess.user});
});

router.post('/save', (req, res) => {
	sess = req.session;
	if(!sess.user) {
		res.redirect('/login');
		res.end();
	}
	if(req.query.note == null) {
		var newNote = new noteModel({
			user: sess.user,
			title: req.body.title,
			content: req.body.content
		});
		newNote.save();
		console.log("Creation d'une nouvelle note")
		res.redirect('/');
	}
	else {
		noteModel.update({_id: req.query.note}, {title: req.body.title, content: req.body.content}, function(err) {
			if(err) {throw err;}
			console.log("modification de la note : " + req.query.note);
			res.redirect ('/');
		});
	}
})

router.get('/logout', function(req, res) {
	req.session.destroy(function(err) {
		if(err) {throw err;}
		res.redirect('/login');
	});

});

app.use(express.static('public'));

module.exports = router;

var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var path = require('path');

const Picasa = require('picasa');

const picasa = new Picasa();

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/gmail-nodejs-quickstart.json
var SCOPES = ['https://picasaweb.google.com/data/'];
var TOKEN_DIR = path.join((process.env.HOME  ||
    process.env.USERPROFILE || process.env.HOMEPATH), '.credentials');
var TOKEN_PATH = path.join(TOKEN_DIR, 'gmail-nodejs-quickstart.json');

var CLIENT_SECRET_PATH = path.join(global.__dirname || __dirname, 'client_secret.json');

// Load client secrets from a local file.
fs.readFile(CLIENT_SECRET_PATH, function processClientSecrets(err, content) {
	if (err) {
		console.log('Error loading client secret file: ' + err);
		return;
	}
	// Authorize a client with the loaded credentials, then call the
	// Gmail API.
	authorize(JSON.parse(content), getPhotos);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
	var clientSecret = credentials.installed.client_secret;
	var clientId = credentials.installed.client_id;
	var redirectUrl = credentials.installed.redirect_uris[0];
	var auth = new googleAuth();
	var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

	// Check if we have previously stored a token.
	fs.readFile(TOKEN_PATH, function(err, token) {
		if (err) {
			getNewToken(oauth2Client, callback);
		} else {
			var token = JSON.parse(token);
			console.log('Read token: ', token);
			
			var expire = new Date(token.expiry_date);

			if(expire <= new Date())
				refreshToken(token.refresh_token, oauth2Client, callback)
			else
				callback(token.access_token);
		}
	});
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
	var authUrl = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES
	});
	console.log('Authorize this app by visiting this url: ', authUrl);
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	rl.question('Enter the code from that page here: ', function(code) {
		rl.close();
		oauth2Client.getToken(code, function(err, token) {
		if (err) {
			console.log('Error while trying to retrieve access token', err);
			return;
		}
		
		console.log('token: ', token);
		storeToken(token);
	
			callback(token.access_token);
		});
	});
}

function refreshToken(refresh_token, oauth2Client, callback) {

	oauth2Client.credentials = { "refresh_token": refresh_token };

	oauth2Client.refreshAccessToken((err, token) => {
		if (err) {
		  console.log('Error while trying to retrieve access token', err);
		  return;
		}
	  
		console.log('token: ', token);
		storeToken(token);
		  
		callback(token.access_token);
	});
  }

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
	try {
		fs.mkdirSync(TOKEN_DIR);
	} catch (err) {
		if (err.code != 'EEXIST') {
		throw err;
		}
	}
	fs.writeFile(TOKEN_PATH, JSON.stringify(token));
	console.log('Token stored to ' + TOKEN_PATH);
}

//https://developers.google.com/picasa-web/docs/2.0/reference

function getPhotos(accessToken) {
    
	console.log('accessToken: ', accessToken);
	
    picasa.getPhotos(accessToken, { imgmax: 'd', maxResults: 999999}, (err, photos) => {
         if (err) {
            console.log('The API returned an error: ' + err, err);
            return;
        }
			
		try {
			console.log('photos: ', photos)

			addPhotos(photos);
		}
		catch(err) {
			console.error('getPhotosError: ', err);
		}
    })
}

function addPhotos(photos) {
	var slides = document.getElementsByClassName('slides')[0];
	slides.innerHTML = "";

	photos.sort(function() {
		return .5 - Math.random();
	})
	.forEach(photo => {
		photo.div = addPhoto(slides, photo);
	}, this);

	if(photos.length > 0) {
		var img = preload(photos[0]);
		//img.addEventListener('load', () => slideshow(photos))
		slideshow(photos);
		//w3.slideshow(".slide", 5000);
	}
}

function addPhoto(slides, photo) {
	if(photo.title.endsWith(".mp4")) {
		var source = document.createElement('source');
		//source.src = photo.content.src;
		var video = document.createElement('video');
		//video.className = 'slide';
		video.style.display = 'none';
		video.appendChild(source);
		slides.appendChild(video);

		return video;
	}
	else {
		var image = document.createElement('img');
		//image.src = photo.content.src;
		//image.className = 'slide';
		image.style.display = 'none';
		slides.appendChild(image);

		return image;
	}
}

var slideIndex = 0;

function slideshow(photos) {

	if(slideIndex > 0)
		photos[slideIndex-1].div.style.display = 'none';

	slideIndex++;

	if(slideIndex > photos.length)
		slideIndex = 1;
	if(photos[slideIndex-1].title.endsWith(".mp4"))
		photos[slideIndex-1].div.source.src = photos[slideIndex-1].content.src;
	else
		photos[slideIndex-1].div.src = photos[slideIndex-1].content.src;
	photos[slideIndex-1].div.style.display = 'block';

	preload(photos[slideIndex]);

	setTimeout(() => slideshow(photos), 5000, photos);
}

function preload(photo) {
	var img = new Image();
	img.src = photo.content.src;
	return img;
}
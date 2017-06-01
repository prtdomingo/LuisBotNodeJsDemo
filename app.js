// Load .env file 
require('dotenv-extended').load();

var builder = require('botbuilder');
var restify = require('restify');
var Restaurant = require('./restaurant');

// setup server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// connector for bot framework
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector, function (session) {
    session.send('Sorry, I did not understand your message \'%s\'. You can type \'Help\' for assistance', session.message.text);
});

// See https://www.luis.ai to create your own service
var recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
bot.recognizer(recognizer);

bot.dialog('OrderFood', [
    function(session, args, next){
        session.send('Order Food Dialog');
        session.endDialog();
    }
]).triggerAction({
    matches: 'OrderFood',
    onInterrupted: function(session){
        session.send('OrderFood on interrupted');
    }
});

bot.dialog('SearchRestaurant', [
    function(session, args, next){

        var geographyEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'PhilippinesGeography');

        if(geographyEntity){
            next({ response: geographyEntity.entity });
        } else {
            builder.Prompts.text(session, 'Please enter a location');
        }
    },
    function (session, result){
        var location = result.response;

        var message = 'Looking for restaurants around %s...';
        session.send(message, location);

        Restaurant.searchRestaurants(location).then(function (restaurants) {
            
            session.send('I found a total of %d restaurants', restaurants.length);

            var message = new builder.Message()
                                     .attachmentLayout(builder.AttachmentLayout.carousel)
                                     .attachments(restaurants.map(restaurantAsAttachment));
            session.send(message);

            session.endDialog();
        });

    }
]).triggerAction({
    matches: 'SearchRestaurant',
    onInterrupted: function(session){
        session.send('Search Restaurant OnInterrupted');
    }
});

function restaurantAsAttachment(restaurant) {
    return new builder.HeroCard()
                      .title(restaurant.name)
                      .subtitle('%d stars rating.', restaurant.rating)
                      .images([new builder.CardImage().url(restaurant.image)])
                      .buttons([
                          new builder.CardAction()
                                     .title('View in Google Maps')
                                     .type('openUrl')
                                     .value('https://www.google.com.ph/maps/search/' + encodeURIComponent(restaurant.name) 
                                        + ' in ' + encodeURIComponent(restaurant.location))
                      ]);
}
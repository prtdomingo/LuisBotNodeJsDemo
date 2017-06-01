'use strict';

// Load .env file 
require('dotenv-extended').load();

const builder = require('botbuilder');
const restify = require('restify');
const Restaurant = require('./restaurant');

// setup server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log('%s listening to %s', server.name, server.url);
});

// connector for bot framework
const connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());

const bot = new builder.UniversalBot(connector, (session) => {
    session.send('Sorry, I did not understand your message \'%s\'', session.message.text);
});

// See https://www.luis.ai to create your own service
const recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
bot.recognizer(recognizer);

bot.dialog('OrderFood', [
    (session, args, next) => {
        const foodName = builder.EntityRecognizer.findEntity(args.intent.entities, 'foodName');
        const foodSize = builder.EntityRecognizer.findEntity(args.intent.entities, 'foodSize');
        const restaurantName = builder.EntityRecognizer.findEntity(args.intent.entities, 'restaurantName');

        let foodOrder = session.dialogData.foodOrder = {
            name: foodName ? foodName.entity : null,
            size: foodSize ? foodSize.entity : null,
            restaurant: restaurantName ? restaurantName.entity : null
        };

        if(foodOrder.name) {
            next();
        } else {
            builder.Prompts.text(session, 'What food would you like to order?');
        }
    },
    (session, results, next) => {
        let foodOrder = session.dialogData.foodOrder;
        if(results.response) {
            foodOrder.name = results.response;
        } 

        if(foodOrder.size) {
            next();
        } else {
            builder.Prompts.choice(session, 'What size would you want?', ['regular', 'large', 'jumbo']);
        }
    },
    (session, results, next) => {
        let foodOrder = session.dialogData.foodOrder;
        if(results.response) {
            foodOrder.size = results.response;
        }

        if(foodOrder.restaurant) {
            next();
        } else {
            builder.Prompts.text(session, 'Where would you want to order this food?');
        }
    },
    (session, results) => {
        let foodOrder = session.dialogData.foodOrder;
        if(results.response) {
            foodOrder.restaurant = results.response;
        }
        
        let message = 'I will now order your ' + (foodOrder.size.entity ? foodOrder.size.entity : foodSize.entity) + ' ' + 
                        foodOrder.name + ' at ' + foodOrder.restaurant;

        session.send(message);
        session.endDialog();
    }
]).triggerAction({
    matches: 'OrderFood'
}).cancelAction('cancelOrder', "Order canceled.", {
    matches: /^(cancel|nevermind)/i,
    confirmPrompt: "Are you sure?"
});;

bot.dialog('SearchRestaurant', [
    (session, args, next) => {
        const geographyEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'PhilippinesGeography');

        if(geographyEntity){
            next({ response: geographyEntity.entity });
        } else {
            builder.Prompts.text(session, 'Where?');
        }
    },
    (session, result) => {
        var location = result.response;

        var message = 'Just a second, I\'m currently looking for restaurants around %s...';
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
    matches: 'SearchRestaurant'
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
                                     .value('https://www.google.com.ph/maps/search/' + 
                                        encodeURIComponent(restaurant.name) + ' in ' + encodeURIComponent(restaurant.location))
                      ]);
}
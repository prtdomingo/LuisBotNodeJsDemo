var Promise = require('bluebird');
var arrayShuffle = require('shuffle-array');

module.exports = {
    searchRestaurants: function (location) {
        return new Promise(function (resolve){
            
            var restaurant = [];
            var restaurantCollection = ['Jollibee', 'McDonalds', 'KFC', 'Chowking', 'Tokyo Tokyo'];

            arrayShuffle(restaurantCollection);

            for (var i = 0; i < 5; i++){
                restaurant.push({
                    name: restaurantCollection[i],
                    location: location,
                    rating: Math.ceil(Math.random() * 5),
                    image: 'https://placeholdit.imgix.net/~text?txtsize=35&txt=' + restaurantCollection[i] + '&w=500&h=260'
                });
            }
            
            setTimeout(function () { resolve(restaurant); }, 1000);
        });
    }
};

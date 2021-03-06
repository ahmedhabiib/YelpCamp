const Campground = require('../models/campground/campground');
const Review = require('../models/campground/review');

module.exports.newReview = async(req, res, next) => {
    const campground = await Campground.findById(req.params.id);
    const review = new Review(req.body.review);
    campground.reviews.push(review);
    review.author = req.user._id;
    await review.save();
    await campground.save();

    res.redirect(`/campgrounds/${campground._id}`)
};

module.exports.deleteReview = async(req, res, next) => {
    const { id, reviewId } = req.params;
    await Campground.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId)
    res.redirect(`/campgrounds/${id}`)
        // next()
}
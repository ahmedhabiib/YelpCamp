const campground = require('../models/campground/campground');
const Campground = require('../models/campground/campground');
const mbxGeoCoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapboxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeoCoding({ accessToken: mapboxToken })
const { cloudinary } = require('../cloudinary/index')

module.exports.index = async(req, res) => {
    const campgrounds = await Campground.find({})
    res.render('campgrounds/index', { campgrounds })
};

module.exports.renderNewForm = (req, res) => {
    res.render('campgrounds/new')
};

module.exports.createCampground = async(req, res, next) => {
    const geoData = await geocoder.forwardGeocode({
        query: req.body.campground.location,
        limit: 1
    }).send();
    const campground = new Campground(req.body.campground);
    campground.geometry = geoData.body.features[0].geometry;
    campground.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
    campground.author = req.user._id;
    await campground.save()
    console.log(campground)
    req.flash('success', 'Successfully Created New Post')
    res.redirect(`/campgrounds/${campground._id}`);
};

module.exports.showCampground = async(req, res, next) => {
    const campground = await Campground.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    }).populate('author');
    if (!campground) {
        req.flash('error', "Can't Find that Campground!");
        return res.redirect('/campgrounds')
    }
    res.render('campgrounds/show', { campground })
};
module.exports.renderEditForm = async(req, res, next) => {
    const { id } = req.params;
    const campground = await Campground.findById(id);
    if (!campground) {
        req.flash('error', "Can't Edit that Campground!");
        return res.redirect('/campgrounds')
    }
    res.render('campgrounds/edit', { campground });
};

module.exports.updateCampground = async(req, res, next) => {
    const geoData = await geocoder.forwardGeocode({
        query: req.body.campground.location,
        limit: 1
    }).send();
    const { id } = req.params;
    const editCamp = await Campground.findByIdAndUpdate(id, req.body.campground, { runValidators: true });
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    editCamp.images.push(...imgs)
    await editCamp.save()
    if (req.body.deleteImages) {
        for (let filename of req.body.deleteImages) {
            await cloudinary.uploader.destroy(filename)
        }
        await editCamp.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
    }
    if (req.body.campground.location === campground.location) {
        console.log('UPDATE RUNNING!!!')
        await campground.updateOne({ $set: { geometry: geoData.body.features[0].geometry } })
    } else {
        console.log('UPDATE NOT RUNNING!!!')
    }
    if (!editCamp) {
        req.flash('error', "Can't Find that Campground!");
        return res.redirect('/campgrounds')
    }
    console.log(editCamp)
    req.flash('success', 'Successfully Edited Campground!')
    res.redirect(`/campgrounds/${id}`);
};

module.exports.deleteCampground = async(req, res, next) => {
    const { id } = req.params;
    const deletedCamp = await Campground.findByIdAndDelete(id);
    if (!deletedCamp) {
        req.flash('error', "Can't Delete that Campground!");
        return res.redirect('/campgrounds')
    }
    req.flash('success', 'Successfully Deleted Campground!');
    res.redirect('/campgrounds');
}
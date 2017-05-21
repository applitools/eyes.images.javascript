/*
 ---

 name: Eyes

 description: The main type - to be used by the users of the library to access all functionality.

 ---
 */

(function () {
    "use strict";

    //noinspection JSUnresolvedFunction
    var RSVP = require('rsvp'),
        EyesSDK = require('eyes.sdk'),
        EyesUtils = require('eyes.utils'),
        EyesBase = EyesSDK.EyesBase,
        MutableImage = EyesUtils.MutableImage,
        RegionProvider = EyesUtils.RegionProvider,
        CoordinatesType = EyesUtils.CoordinatesType,
        PromiseFactory = EyesUtils.PromiseFactory;

    /**
     * @constructor
     * Initializes an Eyes instance.
     * @param {String} [serverUrl]
     * @param {Boolean} [isDisabled] - set to true to disable Applitools Eyes and use the web driver directly.
     * @param {PromiseFactory} [promiseFactory] If not specified will be created using RSVP lib
     * @augments EyesBase
     **/
    function Eyes(serverUrl, isDisabled, promiseFactory) {
        if (promiseFactory) {
            this._promiseFactory = promiseFactory;
        } else if (RSVP && RSVP.Promise) {
            this._promiseFactory = new PromiseFactory(function (asyncAction) {
                return new RSVP.Promise(asyncAction);
            }, function () {
                return RSVP.defer();
            });
        } else {
            throw new Error("PromiseFactory or RSVP module is required.");
        }

        EyesBase.call(this, this._promiseFactory, serverUrl || EyesBase.DEFAULT_EYES_SERVER, isDisabled);
        this._imageProvider = undefined;
        this._screenshot = undefined;
        this._title = undefined;
        this._inferredEnvironment = undefined;
    }

    Eyes.prototype = new EyesBase();
    Eyes.prototype.constructor = Eyes;

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype._getBaseAgentId = function () {
        return 'eyes.images/0.0.41';
    };

    /**
     * Starts a test.
     * @param {string} appName -     The application being tested.
     * @param {string} testName -    The test's name.
     * @param {Object} imageSize -   Determines the resolution used for the baseline. {@code null} will automatically
     *                              grab the resolution from the image.
     * @return {Promise}
     */
    Eyes.prototype.open = function (appName, testName, imageSize) {
        return EyesBase.prototype.open.call(this, appName, testName, imageSize);
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Returns whether is open or not.
     * @return {boolean} Whether or not session is opened
     */
    Eyes.prototype.isOpen = function () {
        return this._isOpen;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Perform visual validation for the current image.
     * @param {Buffer|ImageProvider} image - The image png bytes or ImageProvider.
     * @param {string} tag - An optional tag to be associated with the validation checkpoint.
     * @param {boolean} ignoreMismatch - True if the server should ignore a negative result for the visual validation.
     * @param {number} retryTimeout - optional timeout for performing the match (ms).
     * @return {Promise}
     */
    Eyes.prototype.checkImage = function (image, tag, ignoreMismatch, retryTimeout) {
        this._logger.verbose('checkRegion(image, "', tag, '", ', ignoreMismatch, ',', retryTimeout, ')');
        //noinspection JSCheckFunctionSignatures
        return this._checkImage(image, tag, ignoreMismatch, retryTimeout);
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Perform visual validation for the current image.
     * @param {Object} region - The region of the image which should be verified, or {undefined}/{null} if
     *                          the entire image should be verified.
     * @param {Buffer|ImageProvider} image - The image png bytes or ImageProvider.
     * @param {string} tag - An optional tag to be associated with the validation checkpoint.
     * @param {boolean} ignoreMismatch - True if the server should ignore a negative result for the visual validation.
     * @param {number} retryTimeout - optional timeout for performing the match (ms).
     * @return {Promise}
     */
    Eyes.prototype.checkRegion = function (region, image, tag, ignoreMismatch, retryTimeout) {
        this._logger.verbose('checkRegion([', region, '], image, "', tag, '", ', ignoreMismatch, ',', retryTimeout, ')');
        var regionProvider = new RegionProvider(region, CoordinatesType.CONTEXT_AS_IS);
        return this._checkImage(image, tag, ignoreMismatch, retryTimeout, regionProvider);
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Replaces the actual image in a running session.
     * @param {number} stepIndex - The zero based index of the step in which to replace the image.
     * @param {Buffer} image - The updated image png bytes.
     * @param {string|undefined} tag - A tag to be associated with the validation checkpoint.
     * @param {string|undefined} title - A title to be associated with the validation checkpoint.
     * @param {Array|undefined} userInputs - An array of user inputs to which lead to the validation checkpoint.
     * @return {Promise}
     */
    Eyes.prototype.replaceImage = function (stepIndex, image, tag, title, userInputs) {
        this._logger.verbose('replaceImage(', stepIndex, 'image, "', tag, '", "', title, '", userInputs)');
        //noinspection JSCheckFunctionSignatures
        return EyesBase.prototype.replaceWindow.call(this, stepIndex, image, tag, title, userInputs);
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Takes a screenshot.
     * @return {Promise.<MutableImage>} An updated screenshot.
     */
    Eyes.prototype.getScreenShot = function () {
        var that = this;
        if (this._imageProvider) {
            return this._imageProvider.getScreenshot().then(function (screenshot) {
                that._screenshot = screenshot;
                return screenshot;
            });
        }

        return this._promiseFactory.makePromise(function (resolve) {
            resolve(that._screenshot);
        });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Get the title.
     * @return {Promise} The current title of of the AUT.
     */
    Eyes.prototype.getTitle = function () {
        return this._promiseFactory.makePromise(function (resolve) {
            resolve(this._title);
        }.bind(this));
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Set the inferred environment string.
     * @param {string} inferredEnvironment - The inferred environment string.
     */
    Eyes.prototype.setInferredEnvironment = function (inferredEnvironment) {
        this._inferredEnvironment = inferredEnvironment;
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Get the inferred environment string.
     * @return {Promise} A promise which resolves to the inferred environment string.
     */
    Eyes.prototype.getInferredEnvironment = function () {
        return this._promiseFactory.makePromise(function (resolve) {
            resolve(this._inferredEnvironment);
        }.bind(this));
    };

    /**
     * Internal function for performing an image verification for an image (or a region of an image).
     * @param {Buffer|ImageProvider} image - The image png bytes or ImageProvider.
     * @param {string} tag - An optional tag to be associated with the validation checkpoint.
     * @param {boolean} ignoreMismatch - True if the server should ignore a negative result for the visual validation.
     * @param {number} retryTimeout - The amount of time to retry matching in milliseconds or a negative
     * value to use the default retry timeout.
     * @param {RegionProvider} regionProvider - The region of the image which should be verified,
     * or {undefined}/{null} if the entire image should be verified.
     * @return {Promise}
     * @private
     */
    Eyes.prototype._checkImage = function (image, tag, ignoreMismatch, retryTimeout, regionProvider) {
        if (image instanceof Buffer) {
            this._screenshot = new MutableImage(image, this._promiseFactory);
            this._imageProvider = null;
        } else {
            this._screenshot = null;
            this._imageProvider = image;
        }

        this._title = tag || '';
        return EyesBase.prototype.checkWindow.call(this, tag, ignoreMismatch, retryTimeout, regionProvider);
    };

    //noinspection JSUnusedGlobalSymbols
    Eyes.prototype._waitTimeout = function (ms) {
        var that = this;
        return this._promiseFactory.makePromise(function (resolve) {
            that._logger.log('Waiting', ms, 'ms...');
            setTimeout(function () {
                that._logger.log('Waiting finished.');
                resolve();
            }, ms);
        });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Get the viewport size.
     * @return {Promise}
     */
    Eyes.prototype.getViewportSize = function () {
        var that = this;
        return this._promiseFactory.makePromise(function (resolve) {
            resolve();
        }).then(function () {
            if (that._screenshot) {
                // if screenshot is specified, then use it
                return that._screenshot;
            }

            // if screenshot is not specified, then retrieving it from provider
            return that.getScreenShot();
        }).then(function (screenshot) {
            return screenshot.asObject();
        }).then(function (imageObject) {
            return {
                width: imageObject.width,
                height: imageObject.height
            }
        });
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Set the viewport size.
     * @param {Int} size - The amount to set the viewport size.
     * @return {Promise}
     */
    Eyes.prototype.setViewportSize = function (size) {
        return this._promiseFactory.makePromise(function (resolve) {
            //noinspection JSUnusedGlobalSymbols
            this._viewportSize = size;
            resolve();
        }.bind(this));
    };

    //noinspection JSUnusedGlobalSymbols
    /**
     * Get the AUT session id.
     * @return {Promise}
     */
    Eyes.prototype.getAUTSessionId = function () {
        return this._promiseFactory.makePromise(function (resolve) {
            resolve(undefined);
        });
    };

    //noinspection JSUnresolvedVariable
    module.exports = Eyes;
}());

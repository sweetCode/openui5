/*
 * ! ${copyright}
 */
// Provides control sap.ui.dt.MiniMenu.
/* globals sap */
sap.ui.define([
    'jquery.sap.global', './library', 'sap/ui/unified/Menu', 'sap/ui/core/Control'
], function (jQuery, library, Menu, Control) {
    "use strict";

    /**
     * Constructor for a new sap.ui.dt.MiniMenu control.
     *
     * @param {string} [sId] id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     * @class A simple MiniMenu.
     * @extends sap.ui.core.Control
     * @author SAP SE
     * @version ${version}
     * @constructor
     * @private
     * @experimental
     * @alias sap.ui.dt.MiniMenu
     */
    var MiniMenu = Control.extend('sap.ui.dt.MiniMenuControl', {

        metadata: {
            properties: {

                /**
                 * Defines the maximum number of buttons displayed in the non-expanded version of the control.
                 * If more than n buttons are added an overflow button will be displayed instead of the nth button (n = maxButtonsDisplayed).
                 */
                "maxButtonsDisplayed": {
                    type: "int",
                    defaultValue: 4
                },
                /**
                 * Defines the buttons on the MiniMenu
                 * The objects should have the following properties:
                 * text - for the button text in the expanded verion and the tooltip in the non-expanded version
                 * icon - the url of the butons icon
                 * handler - the function to call when the button is pressed
                 */
                "buttons" : {type : "object[]", defaultValue : []},
                /**
                 * The Style clss which should be added to the MiniMenu
                 */
                styleClass: {
                    type: "string"
                }
            },

            events: {
                /**
                 * This event is fired after opening the MiniMenu
                 */
                Opened: { },
                /**
                 * This event is fired after closing the MiniMenu
                 */
                Closed: { },
                /**
                 * This event is fired when the overfow button gets pressed
                 */
                OverflowButtonPressed: { }
            }
        },

        /**
         * initializes the MiniMenu by adding a sap.m.Popover (with a sap.m.Flexbox as a content aggregation) as a Dependent of the MiniMenu
         */
        init: function () {

            var sPopId = this.getId() + "-popover";

            var oPopover = new sap.m.Popover(sPopId,{
                showHeader : false,
                verticalScrolling : false,
                horizontalScrolling : false,
                content : new sap.m.HBox(sPopId + "ContentBox", {
                    renderType : "Bare"
                })
            });

            oPopover.oPopup.attachClosed(this._popupClosed, this);
            this.addDependent(oPopover);

            var sPopExpId = this.getId() + "-popoverExp";

            var oPopoverExpanded = new sap.m.Popover(sPopExpId,{
                showHeader : false,
                verticalScrolling : false,
                horizontalScrolling : false,
                content : new sap.m.VBox(sPopExpId + "ContentBox", {
                    renderType : "Bare"
                })
            });
            oPopoverExpanded.oPopup.attachClosed(this._popupClosed, this);
            this.addDependent(oPopoverExpanded);

            oPopover.attachBrowserEvent("contextmenu", this._onContextMenu, this);
            oPopoverExpanded.attachBrowserEvent("contextmenu", this._onContextMenu, this);
            this.onInit = true;

            var oStatic;
            try {
                oStatic = sap.ui.getCore().getStaticAreaRef(); //bei AdditionalElementsPlugin nachschauen
                oStatic = sap.ui.getCore().getUIArea(oStatic);
            } catch (e) {
                jQuery.sap.log.error(e);
                throw new Error("Popup cannot be opened because static UIArea cannot be determined.");
            }

            oStatic.addContent(this, true);
        },

        exit: function () {
            this.getPopover(true).detachBrowserEvent("contextmenu", this._onContextMenu, this);
            this.getPopover(false).detachBrowserEvent("contextmenu", this._onContextMenu, this);
            window.removeEventListener("scroll", this._close, {capture: true, once: true});
        },

        /**
	     * Opens the MiniMenu and sets the MiniMenu position by the oSource parameter.
         * Note: this gets called before the old Menu is closed because of asynchronus animations.
	     * @param {sap.ui.core.Control} oSource - The control by which the Popover will be placed.
         * @param {boolean} bContextMenu - If the MiniMenu should appear as Context Menu
         * @param {Object} contextMenuPosition - The position of the MiniMenu if it should be opened as Context Menu (only needed if bContextMenu)
         * @public
         */
        show: function (oSource, bContextMenu, contextMenuPosition) {

            this._close =  this.close.bind(this);

            window.addEventListener("scroll", this._close, {capture: true, once: true});

            this._openAsContextMenu = bContextMenu;
            this._contextMenuPosition = contextMenuPosition;
            this.getPopover().addStyleClass(this.getStyleClass());

            // creates buttons specified in objects in property buttons
            var aButtons = this.getButtons();
            this._oTarget = oSource;

            if (!this._openAsContextMenu){
                var iButtonsEnabled = 0;
                for (var i7 = 0; i7 < aButtons.length; i7++) {
                    if (aButtons[i7].getEnabled()){
                        iButtonsEnabled += 1;
                        if (!this._firstVisibleButtonIndex){
                            this._firstVisibleButtonIndex = i7;
                        }
                    }
                }

                if (iButtonsEnabled - 1 >= this.getMaxButtonsDisplayed()){ // -1 because of Overflow-Button
                    for (var i1 = this.getMaxButtonsDisplayed(); i1 < aButtons.length; i1++) {
                        aButtons[i1].setVisible(false);
                    }
                } else if (iButtonsEnabled != 0) {
                    aButtons.forEach(function (_button) {
                        _button.setVisible(_button.getEnabled());
                    });
                } else {
                    for (var i8 = this.getMaxButtonsDisplayed(); i8 < aButtons.length; i8++) {
                        aButtons[i8].setVisible(false);
                    }
                    this._firstVisibleButtonIndex = 0;
                }


                // hides the nth button if (n > number of buttons) and creates/displays the overflow button (n = maxButtonsDisplayed)
                if (this.getMaxButtonsDisplayed() < aButtons.length) {
                    aButtons[this.getMaxButtonsDisplayed() - 1].setVisible(false);
                    this.addButton(this._createOverflowButton());
                } else if (iButtonsEnabled < aButtons.length && iButtonsEnabled != 0) {
                    this.addButton(this._createOverflowButton());
                }

                iButtonsEnabled = null;

                // sets the Tooltips
                for (var i2 = 0; i2 < this.getMaxButtonsDisplayed() && i2 < aButtons.length; i2++) {
                    aButtons[i2].setTooltip(this.getProperty("buttons")[i2].getText(oSource));
                }
            } else {
                this._firstVisibleButtonIndex = 0;
                // makes the hidden buttons and their text visible
                aButtons.forEach(function(_button){
                    _button.setVisible(true);
                    _button._bInOverflow = true;
                });
            }

            if (this.onInit || !this.getPopover().isOpen()) { // if there was no other MiniMenu open before

                this.finalizeOpening();
                this.onInit = false;
            }
        },

        /**
         * Finalizes the Opening of the MiniMenu. Is called by "_popupClosed" (when the old Menu is closed) or by "show" if there was no MiniMenu opened before
         * Is needed to prevent flickering (wait for old MiniMenu to close)
         */
        finalizeOpening : function (){

            if (this._openAsContextMenu && this._contextMenuPosition.x === null && this._contextMenuPosition.y === null) {
                this._openAsContextMenu = false;
            }

            this._oTarget = this._placeMiniMenu(this._oTarget, this._openAsContextMenu, this._bUseExpPop);

            this.getPopover().openBy(this._oTarget);

            this.getPopover().setVisible(true);
            this.isOpen = true;
            this.openNew = false;

            // fires the afterOpen event
            this.fireOpened();
        },

        /**
         * Works out how the MiniMenu shall be placed
         * Sets the placement property of the popover
         * Places a "fakeDiv" in the DOM which the popover can be opened by
         * @param {sap.m.Control} oSource the overlay
         * @param {boolean} bContextMenu whether the MiniMenu should be opened as a context menu
         * @param {boolean} bExpanded whether the MiniMenu is expanded
         * @return {div} the "fakeDiv"
         * @private
         */
        _placeMiniMenu: function (oSource, bContextMenu, bExpanded) {
            this.getPopover().setShowArrow(true);

            if (!bExpanded || bContextMenu || document.getElementById(this.getPopover().getId()) === null) {
                sap.ui.getCore().getRenderManager().render(this.getPopover(), sap.ui.getCore().getStaticAreaRef());
            }

            var sOverlayId = (oSource.getId && oSource.getId()) || oSource.getAttribute("overlay");

            var oPopoverDimensions = this._getPopoverDimensions(bExpanded, !bContextMenu);
            var oOverlayDimenions = this._getOverlayDimensions(sOverlayId);
            var oViewportDimensions = this._getViewportDimensions();

            var oPosition = {};

            if (bContextMenu) {
                oPosition = this._placeAsContextMenu(this._contextMenuPosition, oPopoverDimensions, oViewportDimensions);
            } else {
                oPosition = this._placeAsMiniMenu(oOverlayDimenions, oPopoverDimensions, oViewportDimensions);
            }

            oPosition.top -= oOverlayDimenions.top;
            oPosition.left -= oOverlayDimenions.left;

            jQuery("#fakeDiv").remove();

            jQuery("#" + sOverlayId).append("<div id=\"fakeDiv\" overlay=\"" + sOverlayId + "\" style = \"position:absolute;top:" + oPosition.top + "px;left:" + oPosition.left + "px;\" />");

            sOverlayId = null;

            return document.getElementById("fakeDiv");
        },

        /**
         * Works out how the ContextMenu shall be placed
         * @param {object} oContPos the context menu position
         * @param {object} oPopover the dimensions of the popover
         * @param {object} oViewport the dimensions of the viewport
         * @return {object} the position of the "fakeDiv"
         */
        _placeAsContextMenu: function (oContPos, oPopover, oViewport) {

            this.getPopover().setShowArrow(false);

            var oPos = {};

            if (oViewport.height - oContPos.y >= oPopover.height) {
                oPos.top = oContPos.y;
                this.getPopover().setPlacement("Bottom");
            } else if (oContPos.y >= oPopover.height) {
                oPos.top = oContPos.y;
                this.getPopover().setPlacement("Top");
            } else if (oViewport.height >= oPopover.height) {
                oPos.top = oViewport.height - oPopover.height;
                this.getPopover().setPlacement("Bottom");
            } else {
                jQuery.error("Your screen size is not supported!");
            }

            if (oViewport.width - oContPos.x >= oPopover.width) {
                oPos.left = oContPos.x;
            } else if (oContPos.x >= oPopover.width) {
                oPos.left = oContPos.x - oPopover.width;
            } else if (oViewport.width >= oPopover.width) {
                oPos.left = oViewport.width - oPopover.width;
            } else {
                jQuery.error("Your screen size is not supported!");
            }

            return oPos;
        },

        /**
         * Works out how the MiniMenu shall be placed
         * @param {object} oOverlay the dimensions of the overlay
         * @param {object} oPopover the dimensions of the popover
         * @param {object} oViewport the dimensions of the viewport
         * @return {object} the position of the "fakeDiv"
         */
        _placeAsMiniMenu: function (oOverlay, oPopover, oViewport) {

            this.getPopover().setShowArrow(true);

            var oPos = {top: null, left: null};

            if (oOverlay.top >= oPopover.height && oViewport.width >= oPopover.width) {
                oPos = this._placeMiniMenuOnTop(oOverlay);
            } else if (oViewport.height - oOverlay.top >= oPopover.height + 5 && oViewport.height >= oPopover.height + 5 && oViewport.width >= oPopover.width) {
                oPos = this._placeMiniMenuAtTheBottom(oOverlay, oPopover, oViewport);
            } else if (oViewport.height >= oPopover.height && oViewport.width >= oPopover.width) {
                oPos = this._placeMiniMenuSideways(oOverlay, oPopover, oViewport);
            } else {
                jQuery.error("Your screen size is not supported!");
            }

            return oPos;
        },

        /**
         * orks out how the MiniMenu shall be placed at the bottom of the overlay
         * @param {object} oOverlay the dimensions of the overlay
         * @return {object} the position of the "fakeDiv"
         */
        _placeMiniMenuOnTop: function (oOverlay) {

            var oPos = {};

            this.getPopover().setPlacement("Top");
            oPos.top = oOverlay.top;
            oPos.left = oOverlay.left + oOverlay.width / 2;

            return oPos;
        },

        /**
         * Works out how the MiniMenu shall be placed at the bottom of the overlay
         * @param {object} oOverlay the dimensions of the overlay
         * @param {object} oPopover the dimensions of the popover
         * @param {object} oViewport the dimensions of the viewport
         * @return {object} the position of the "fakeDiv"
         */
        _placeMiniMenuAtTheBottom: function (oOverlay, oPopover, oViewport) {

            this.getPopover().setPlacement("Bottom");

            var oPos = {};

            oPos.left = oOverlay.left + oOverlay.width / 2;

            if (oOverlay.height < 60 && oViewport.height - oOverlay.top - oOverlay.height >= oPopover.height) {
                oPos.top = oOverlay.bottom;
            } else if (oOverlay.top >= oViewport.top) {
                oPos.top = oOverlay.top + 5;
            } else {
                oPos.top = oViewport.top + 5;
            }

            return oPos;
        },

        /**
         * Works out how the MiniMenu shall be placed sideways
         * @param {object} oOverlay the dimensions of the overlay
         * @param {object} oPopover the dimensions of the popover
         * @param {object} oViewport the dimensions of the viewport
         * @return {object} the position of the "fakeDiv"
         */
        _placeMiniMenuSideways: function (oOverlay, oPopover, oViewport) {

            var oPos = {};

            oPos.left = this._getMiniMenuSidewaysPlacement(oOverlay, oPopover, oViewport);

            oPos.top = this._getMiddleOfOverlayAndViewportEdges(oOverlay, oViewport);

            return oPos;
        },

        /**
         * Works out whether the MiniMenu shall be placed on the right, on the left or from the middle of the overlay
         * @param {object} oOverlay the dimensions of the overlay
         * @param {object} oPopover the dimensions of the popover
         * @param {object} oViewport the dimensions of the viewport
         * @return {integer} the left position of the "fakeDiv"
         */
        _getMiniMenuSidewaysPlacement: function (oOverlay, oPopover, oViewport) {

            var iLeft;

            if (oViewport.width - oOverlay.right >= oPopover.width) {

                this.getPopover().setPlacement("Right");
                iLeft = oOverlay.right;

            } else if (oOverlay.left >= oPopover.width) {

                this.getPopover().setPlacement("Left");
                iLeft = oOverlay.left;

            } else {

                this.getPopover().setPlacement("Right");

                if (oPopover.width <= oViewport.width - (oOverlay.left + oOverlay.width / 2)) {
                    iLeft = (oOverlay.left + oOverlay.width / 2);
                } else {
                    iLeft = oViewport.width - oPopover.width;
                }
            }

            return iLeft;
        },

        /**
         * Works out the middle of the overlay and viewport edges incase the overlay edges are outside of the viewport
         * @param {object} oOverlay the dimensions of the overlay
         * @param {object} oViewport the dimensions of the viewport
         * @return {integer} the top position of the "fakeDiv"
         */
        _getMiddleOfOverlayAndViewportEdges: function (oOverlay, oViewport) {

            var iTop;

            if (oViewport.top > oOverlay.top) {
                iTop = oViewport.top;
            } else {
                iTop = oOverlay.top;
            }

            if (oViewport.bottom < oOverlay.bottom) {
                iTop += oViewport.bottom;
            } else {
                iTop += oOverlay.bottom;
            }

            iTop /= 2;

            return iTop;
        },

        /**
         * Gets the dimensions of the MiniMenu's popover
         * @param {boolean} bExpanded whether the MiniMenu is expanded
         * @param {boolean} bWithArrow whether the arrow width should be added
         * @return {object} the dimensions of the MiniMenu's popover
         */
        _getPopoverDimensions: function (bExpanded, bWithArrow) {

            var oPopover = {};

            oPopover.height = parseInt(jQuery(this.getFlexbox().getDomRef()).children().css("height"), 10);
            this._firstVisibleButtonIndex = null;

            if (bExpanded) {
                oPopover.height *= this.getButtons().length;
                oPopover.width = parseInt(jQuery("#" + this.getPopover().getId()).css("width"), 10);
            } else {
                oPopover.width = parseInt(jQuery(jQuery("#" + this.getFlexbox().getId()).children()[0]).css("width"), 10) * this.getButtons().length;
            }

            if (bWithArrow) {
                var iArr = parseInt(jQuery("#" + this.getPopover(false).getId() + "-arrow").css("height"), 10);
                if (iArr){
                    oPopover.height += 2 * iArr;
                    oPopover.width += 2 * iArr;
                }
            }

            return oPopover;
        },

        /**
         * Gets the dimensions of an overlay
         * @param {String} sOverlayId the overlay
         * @return {object} the dimensions of the overlay
         */
        _getOverlayDimensions: function (sOverlayId) {

            var oOverlay = jQuery("#" + sOverlayId).rect();

            oOverlay.right = oOverlay.left + oOverlay.width;
            oOverlay.bottom = oOverlay.top + oOverlay.height;

            return oOverlay;
        },

        /**
         * Gets the dimensions of the viewport
         * @return {object} the dimensions of the viewport
         */
        _getViewportDimensions: function () {

            var oViewport = {};

            oViewport.width = window.innerWidth;
            oViewport.height = window.innerHeight;
            oViewport.top = parseInt(jQuery(".type_standalone").css("height"), 10) || 0;
            oViewport.bottom = oViewport.top + oViewport.height;

            return oViewport;
        },

        /**
         * Adds a button to the MiniMenu.
         * @param {Object} button the button to add
         * @param {sap.ui.dt.plugin.MiniMenu} oSource the source
         * @param {object} oOverlay the target overlay
         * @return {sap.m.MiniMenu} Reference to this in order to allow method chaining
         * @public
         */
        addButton: function (button, oSource, oOverlay) {

            function handler() {
                this.isOpen = false;
                this.openNew = false;
                oSource._onItemSelected(this);
            }

            if (button.icon == null){
                button.icon = "sap-icon://incident";
            }

            // if some of the objects properties are functions and can't be shown directly
            button.getText = function (oOverlay) {
                return typeof button.text === "function" ? button.text(oOverlay) : button.text;
            };

            button.getEnabled = function (oOverlay) {
                return typeof button.enabled === "function" ? button.enabled(oOverlay) : button.enabled;
            };

            var oButton;

            if (oSource){
                    oButton = new sap.m.OverflowToolbarButton({
                        icon: button.icon ? button.icon : "sap-icon://incident",
                        text: button.getText(oOverlay),
                        type: "Transparent",
                        enabled: button.getEnabled(oOverlay),
                        press: handler,
                        layoutData: new sap.m.FlexItemData({})
                    });

                    oButton.data({
                        id : button.id
                    });

            } else {
                oButton = new sap.m.OverflowToolbarButton({
                    icon: button.icon,
                    text: button.getText(oOverlay),
                    type: "Transparent",
                    enabled: button.getEnabled(oOverlay),
                    press: button.handler,
                    layoutData: new sap.m.FlexItemData({})
                });
            }

            this.setProperty("buttons", this.getProperty("buttons").concat(button));
            this.getFlexbox().addItem(oButton);

            oButton = null;

            return this;
        },

        /**
         * Closes the MiniMenu.
         * @return {sap.m.MiniMenu} Reference to this in order to allow method chaining
         * @public
	     */
        close : function (){
            if (this.getPopover()) {

                jQuery(this.getPopover().getDomRef()).hide();

                this.getPopover().close();

                // deletes the overflow button if there is one
                if (this.getProperty("buttons").length > this.getProperty("maxButtonsDisplayed")){
                    this.setProperty("buttons", this.getProperty("buttons").splice(0,this.getProperty("buttons").length - 1));

                    this.getFlexbox().removeItem(this.getButtons().length - 1);
                }

                jQuery("#" + this.sId).fadeOut();
            }

            return this;
        },

        /**
         * Removes a button from the MiniMenu.
         * @param {int} index the button to remove or its index or id
         * @return {sap.m.OverflowToolbarButton} The removed button or null
         * @public
         */
        removeButton: function (index) {
            this.setProperty("buttons", this.getProperty("buttons").splice(index, 1));

            return this.getFlexbox().removeItem(index);
        },

        /**
         * Removes all buttons from the MiniMenu.
         * @return {sap.m.OverflowToolbarButton} An array of the removed buttons (might be empty)
         * @public
         */
        removeAllButtons: function () {
            this.setProperty("buttons", []);
            return this.getFlexbox().removeAllItems();
        },

        /**
         * Gets all buttons of the MiniMenu.
         * @return {sap.m.OverflowToolbarButton[]} returns buttons
         * @public
         */
        getButtons: function () {
            return this.getFlexbox().getItems();
        },

        /**
         * Inserts a button to the MiniMenu.
         * @param {sap.m.OverflowToolbarButton} button the to insert
         * @param {int} index - the 0-based index the button should be inserted at
         * @return {sap.m.MiniMenu} Reference to this in order to allow method chaining
         * @public
         */
        insertButton: function (button, index) {
            this.getFlexbox().insertItem(button, index);
            return this;
        },

        /**
         * Sets the Buttons of the MiniMenu
         * @param {Object} _buttons the to insert
         * @param {sap.ui.dt.plugin.MiniMenu} oSource - the source
         * @param {object} oOverlay - the target overlay
         * @public
         */
        setButtons: function (_buttons, oSource, oOverlay) {
            this.removeAllButtons();

            if (oOverlay){
                _buttons.forEach( function (oButton) {
                    this.addButton(oButton, oSource, oOverlay);
                }.bind(this));
            } else {
                _buttons.forEach(function (oButton) {
                    this.addButton(oButton, oSource);
                }.bind(this));
            }
        },

        /**
         * Sets the maximum amount of Buttons
         * @param {int} mBd the maximum amount of buttons to be displayed in the non-expanded version of the Mini-Menu
         * @public
         */
        setMaxButtonsDisplayed: function (mBd) {
            if (mBd < 2) {
                throw Error("maxButtonsDisplayed can't be less than two!");
            }
            this.setProperty("maxButtonsDisplayed", mBd);
        },

        /**
         * @param {boolean} bExpanded if undefined return the currently used Popover if true return expanded Popover if false return non-expanded Popover
         * @return {sap.m.Popover} one of the Popovers
         * @public
         */
        getPopover: function (bExpanded) {

            if (bExpanded === undefined) {
                if (this._bUseExpPop) { // see if this needs to be reset explicitly
                    return this.getDependents()[1];
                } else {
                    return this.getDependents()[0];
                }
            } else if (bExpanded) {
                return this.getDependents()[1];
            } else {
                return this.getDependents()[0];
            }
        },

        /**
         * @param {boolean} bExpanded if undefined return the currently used FlexBox if true return expanded FlexBox if false return non-expanded FlexBox
         * @return {sap.m.Flexbox} the FlexBox
         * @public
         */
        getFlexbox: function (bExpanded) {
            return this.getPopover(bExpanded).getContent()[0];
        },

        /**
         * Creates an overflow-button
         * @return {sap.m.OverflowToolbarButton} returns the newly created overflow-button
         * @private
         */
        _createOverflowButton: function () {
            return {
                icon : "sap-icon://overflow",
                type : "Transparent",
                handler : this._onOverflowPress.bind(this),
                enabled : true
            };
        },

        /**
         * Sets the openNew variable (whether a new MiniMenu is opened after closing the old one)
         * @param {boolean} bValue The value for openNew
         */
        setOpenNew: function (bValue) {
            this.openNew = bValue;
        },

        /**
         * Expands the MiniMenu
         * @param {jQuery.Event} evt the press event
         * @private
         */
        _onOverflowPress: function (evt) { // TODO fix Menu locking (_onoverflowPressed unlocks right away since the old popover is closed)

            this.fireOverflowButtonPressed();

            var aButtons = this.getButtons();

            this.getPopover().close();

            this._bUseExpPop = true;

            this.removeAllButtons();

            // // gets the Popover-div for animation
            // var _popoverElement = jQuery(this.getPopover().getDomRef());
            // var _popoverContentElement = jQuery(this.getFlexbox().getDomRef());

            aButtons.forEach(function (oButton) {
                // removes all tooltips
                // makes the hidden buttons and their text visible
                oButton.setTooltip("");
                oButton.setVisible(true);
                oButton._bInOverflow = true;
                this.getFlexbox().addItem(oButton);
            }.bind(this));


            // makes the overflow Button invisible
            aButtons[aButtons.length - 1].setVisible(false);

            // the RenderManager takes too long to rerender them which causes flickering with the animation
            // applying all changes now makes sure the rerendering happens before the animation starts
            sap.ui.getCore().applyChanges();

            // set the placement of the MiniMenu
            var fakeDiv = this._placeMiniMenu(this._oTarget, false, true);

            this.getPopover().addStyleClass(this.getStyleClass());
            this.getPopover().openBy(fakeDiv);

        },

        /**
         * Triggered when MiniMenu is closed
         * needed to prevent flickering when opening up a new MiniMenu
         * (A new Menu would show before the direction was set)
	     */
        _popupClosed : function(){

            window.removeEventListener("scroll", this._close, {capture: true, once: true});

            if (this.getPopover()){ //in case the Menu was destroyed

                this.fireClosed();

                if (this.openNew){
                    this.openNew = false;
                    this.finalizeOpening();
                    return;
                }

            }

            this.isOpen = false;
        },

        /**
         * Handle Context Menu
         *
         * @param {sap.ui.base.Event} oEvent event object
         * @private
         */
        _onContextMenu : function(oEvent) {
            if (!this.getPopover().isOpen()) {
                this.detachBrowserEvent("contextmenu");
                return;
            }
            if (oEvent.preventDefault) {
                oEvent.preventDefault();
            }
        },

        renderer: function () {}
    });

    return MiniMenu;

}, /* bExport= */ true);
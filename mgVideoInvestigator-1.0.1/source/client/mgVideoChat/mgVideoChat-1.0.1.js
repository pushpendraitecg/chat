/**
 * mgVideoChat - Investigator
 *
 * @author Milan Rukavina
 * @version 1.0
 * @copyright magnoliyan
 */

;
// Fallbacks for vendor-specific variables until the spec is finalized.
window.RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection  || window.RTCPeerConnection;
window.PeerConnection = (window.webkitPeerConnection00 || window.webkitPeerConnection|| window.PeerConnection);
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

(function( $, window, document, undefined ){
    /**
     * Default optons values
     */
    /**
     * default options
     */
    var defaults =
    {
        wsURL: 'ws://localhost:8080'
    };


    /**
     * mgVideoChat constructor
     *
     * @param {object} elem
     * @param {object} options
     * @return {mgVideoChat}
     */
    var mgVideoChat = function( elem, options ){
        this.elem = elem;
        this.$elem = $(elem);       
        this.config = $.extend({}, defaults, options);
        //now check compatibility
        var errors = [];
        if(!window.WebSocket){
            errors.push('Your browser does not support websocket.');
        }
        if(!window.RTCPeerConnection && !window.PeerConnection){
            errors.push('Your browser does not support PeerConnections.');
        }
        if(!navigator.getUserMedia){
            errors.push('Your browser does not support user media.');
        }
        if(errors.length > 0){
            errors.push('Please try <a href="http://www.google.com/chrome" target="_blank">Google Chrome</a> or <a href="http://www.mozilla.org/en-US/firefox" target="_blank">Mozilla Firefox</a>');
            this.$elem.html('<div class="alert alert-danger">' + errors.join('<br>') + '</div>');
            return false;
        }
        var self = this;
        var socket = new WebSocket(this.config.wsURL);
        //after socket is opened
        socket.onopen = function() {
            self.$elem.html('<div class="alert alert-success">Congrats! You should be able to use real Magnoliyan Video Chat</div>');
        };
        //ws error
        socket.onerror = function(err) {
            self.$elem.html('<div class="alert alert-danger">Error! Unable to connect to test Chat server</div>');
        };
        //on close
        socket.onclose = function(){
            self.$elem.html('<div class="alert alert-danger">Error! Unable to connect to test Chat server. Make sure that <a href="source/server/web-commander/index.php" target="_blank">chat server</a> is running.</div> and then reload the page.');
        }
    };
       
    /**
     * Jquery entry function
     * 
     * @param {object} options
     * @param {object} params
     * @return {jQuery}
     */
    $.fn.mgVideoChat = function(options, params) {
        this.each(function() {
            return new mgVideoChat(this, options);
        });
    };    
    
})( jQuery, window , document );   // pass the jQuery object to this function
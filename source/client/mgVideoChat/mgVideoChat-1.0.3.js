/**
 * mgVideoChat
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
window.URL = window.URL || window.webkitURL;
window.RTCSessionDescription = window.mozRTCSessionDescription || window.webkitRTCSessionDescription || window.RTCSessionDescription;
window.RTCIceCandidate = window.mozRTCIceCandidate || window.webkitRTCIceCandidate || window.RTCIceCandidate;

(function( $, window, document, undefined ){
    /**
     * Default optons values
     */
    /**
     * default options
     */
    var defaults =
    {
        wsURL: 'ws://localhost:8080',
        dir: '{rel}',
        tplMain:'/tpls/main.html',
        tplConnections:'/tpls/connections.html',
        tplConnection:'/tpls/connection.html',
        tplChat: '/tpls/chat.html',
        sound: {
            mp3: '/sounds/ring.mp3',
            ogg: '/sounds/ring.ogg'
        },
        debug: true,
        login: null,
        rtc: {
            // Holds the STUN server to use for PeerConnections.
            pcConfig: {
                iceServers: [
                    {url: "stun:stun.l.google.com:19302"},
                    //{url: "turn:numb.viagenie.ca", credential: "webrtcdemo", username: "louis%40mozilla.com"}
                ]
            },
            pcConstraints: {"optional": [{"DtlsSrtpKeyAgreement": true}]},
            offerConstraints: {"optional": [], "mandatory": {}},
            mediaConstraints: {"audio": true, "video": true},
            sdpConstraints: {
                'mandatory': {
                    'OfferToReceiveAudio': true,
                    'OfferToReceiveVideo': true
                }
            },
            audio_receive_codec: 'opus/48000'
        }
    };

    var config = {};

    /**
     * mgVideoChat constructor
     *
     * @param {object} elem
     * @param {object} options
     * @return {mgVideoChat}
     */
    var mgVideoChat = function( elem, options ){
        this.version = '1';
        this.elem = elem;
        this.$elem = $(elem);
        this.$connectionsPanel = null;
        this.options = options;
        this.metadata = this.$elem.data("mgVideoChat-options" );
        this.config = $.extend({}, defaults, this.options);
        config = this.config;
        rtc.init(this.config.rtc);
        this.fixPath();
        this.init();
        this.$elem.data("mgVideoChat-instance",this);
        this.chatId = null;
        this.videoId = null;
        this.videoInvitedId = null;
        this.connectionId = null;
        this.userData = {};        
    };

    /**
     * Fix relative paths
     */
    mgVideoChat.prototype.fixPath = function(){
        if(this.config.dir != '{rel}'){
            return ;
        }
        var self = this;
        //get relative path
        $('script').each(function(){
            var src = $(this).attr('src');
            var suffix = "mgVideoChat-";
            if(src && src.indexOf(suffix, this.length - suffix.length) !== -1){
                self.config.dir = src.replace(/\\/g, '/').replace(/\/[^\/]*\/?$/, '');
                //try non min version
                var regex = /mgVideoChat\-(\d*\.\d*\.\d*)\.js/gi;
                var match = regex.exec(src);
                if(match && match[1]){
                    self.version = match[1];
                }
                else{
                    regex = /mgVideoChat\-(\d*\.\d*\.\d*)\-min\.js/gi;
                    match = regex.exec(src);
                    if(match && match[1]){
                        self.version = match[1];
                    }
                    else{
                        self.version = 1
                    }
                }                
            }
            else{
                suffix = "mgVideoChat";
                if(src && src.indexOf(suffix, this.length - suffix.length) !== -1){
                    self.config.dir = src.replace(/\\/g, '/').replace(/\/[^\/]*\/?$/, '');
                    self.version = 1;
                }
            }
        });
    }

    /**
     * Init plugin - update dom, set properties
     */
    mgVideoChat.prototype.init = function(){
        var self = this;
        //load and parse templetes - first conns tpl
        this.loadTplByName('tplConnections', function(connTpl){
            //load main tpl
            self.loadTplByName('tplMain', function(mainTpl){
                self.$elem.html(self.tmpl(mainTpl,{config:self.config}));
                self.$connectionsPanel = self.$elem.find('#connectionsPanel');
                self.$messagePanel = self.$elem.find('#messagePanel');
                self.$loginPanel = self.$elem.find('#loginPanel');
                self.$videoPanel = self.$elem.find('#videoPanel');
                self.$loginDialog = self.$elem.find('#loginDialog');
                self.$callPanel = self.$elem.find('#callPanel');
                self.$answerDialog = self.$elem.find('#answerDialog');
                self.$chatPanel = self.$elem.find('#chatPanel');
                //now check compatibility
                var errors = {};
                if(!rtc.checkCompatibility(errors)){
                    self.debug(errors);
                    var errorMessages = {
                        'websocket': 'Your browser does not support websocket.',
                        'peerconnection': 'Your browser does not support PeerConnections.',
                        'usermedia': 'Your browser does not support user media.'
                    };
                    var errorMessage = [];
                    for(var error in errors){
                        errorMessage.push(errorMessages[error]);
                    }
                    errorMessage.push('Please try <a href="http://www.google.com/chrome" target="_blank">Google Chrome</a> or <a href="http://www.mozilla.org/en-US/firefox" target="_blank">Mozilla Firefox</a>');
                    self.message(errorMessage.join('<br>'),'danger');
                }
                else{
                    //try to connect to WS
                    rtc.connect(self.config.wsURL);
                }
                self.initDom();
                self.initRtc();
            });
        });        
    };
    
    /**
     * Init DOM
     */
    mgVideoChat.prototype.initDom = function(){
        var self = this;        
        //login button
        self.$loginPanel.find('#loginButton').click(function(){
            if(self.config.login){
                self.config.login(function(){
                    rtc.login();
                });
            }
            else{                
                self.$loginDialog.modal('show');                
            }
        });
        self.$loginDialog.on('shown.bs.modal',function(){
            self.$loginDialog.find('#userName').focus();
        })
        var onLogin = function(){
            if(self.$loginDialog.find('#userName').val()){
                //set cookie for the server
                self.setCookie('mgVideoChatSimple', self.$loginDialog.find('#userName').val(), 30, window.location.host);
                self.$loginDialog.modal('hide');
                //reload to use new cookie
                window.location.reload();
            }
        };
        self.$loginDialog.find('#userName').keypress(function(e){
            if (e.keyCode === 13) {
                onLogin();
                return false;
            }
        })
        self.$loginDialog.find('button.login').click(onLogin);
        //video buttons
        self.$videoPanel.find('#videoFullScreen').click(function(){
            var el = self.$videoPanel.get(0),
                rfs = el.requestFullScreen || el.webkitRequestFullScreen || el.mozRequestFullScreen;
            rfs.call(el);
        });
        self.$videoPanel.find('#videoExitFullScreen').click(function(){
            var rfs = document.cancelFullScreen || document.webkitCancelFullScreen || document.mozCancelFullScreen;
            rfs.call(document);
        });
        self.$videoPanel.find('#callHangup').click(function(){
            rtc.drop(self.videoId);
        });
        //answer dialog
        self.$answerDialog.find("#answer").click(function(){
            rtc.accept(self.$answerDialog.data('caller_id'), {
                audio:true,
                video:true
            });
            self.$answerDialog.modal('hide');
        });
        self.$answerDialog.find("#answerAudio").click(function(){
            rtc.accept(self.$answerDialog.data('caller_id'), {
                audio:true,
                video:false
            });
            self.$answerDialog.modal('hide');
        });
        self.$answerDialog.find("#cancelCall").click(function(){
            rtc.drop(self.$answerDialog.data('caller_id'));
            self.$answerDialog.modal('hide');
        });
        //chat
        
    };

    mgVideoChat.prototype.setCookie = function( cookieName, cookieValue, days, domain){
        var domainString = domain ? ("; domain=" + domain) : '';
        document.cookie = cookieName + "=" + encodeURIComponent(cookieValue) + "; max-age=" + (60 * 60 * 24 * days) + "; path=/" + domainString;
    };

    var messageTimeout = null;
    /**
     * Show alter message on top
     *
     * @param {string} messageText is empty hieds message
     * @param {string} messageType success, warning, danger
     * @param {int} expire in seconds
     */
    mgVideoChat.prototype.message = function(messageText, messageType, expire) {
        if(messageTimeout){
            window.clearTimeout(messageTimeout);
        }
        var self = this;
        var $alert = self.$messagePanel.find(".alert");
        var currType = self.$messagePanel.data("type");
        if (!messageText) {
            self.$messagePanel.hide();
            return;
        }
        $alert.removeClass("alert-" + currType).addClass("alert-" + messageType);
        $alert.find("div.text").html(messageText);
        self.$messagePanel.data("type", messageType);
        self.$messagePanel.show();
        if(expire){
            messageTimeout = window.setTimeout(function(){
                self.$messagePanel.hide();
                messageTimeout = null;
            }, expire * 1000);
        }
    };

    /**
     * Write to console if config.debug
     * @param {string} message
     *
     */
    mgVideoChat.prototype.debug = function(message){
        if(this.config.debug){
            console.log(message);
        }
    };

    mgVideoChat.prototype.onConnected = function(){
        this.$loginPanel.show();
    };

    mgVideoChat.prototype.onDisconnected = function(){
        this.disableChat();
    };

    mgVideoChat.prototype.onLogged = function(){
        this.$loginPanel.hide();        
    };

    mgVideoChat.prototype.onConnectionClose = function(connectionId){
        this.$connectionsPanel.find("#connection_" + connectionId).remove();
        this.disableChat(connectionId);
        if(this.videoId == connectionId){
            this.onVideoClose();
        }
        if(this.videoInvitedId == connectionId){
            this.inviteStop();
        }
        delete rtc.connections[connectionId];
    };

    mgVideoChat.prototype.onVideoOpen = function(connectionId){
        this.videoId = connectionId;
        this.$callPanel.find('.panel-title').text('Video Call with ' + rtc.connections[connectionId]['data']['userData']['name']);
        this.$callPanel.show();
        //re-render all connections
        this.renderConnections();
    };

    mgVideoChat.prototype.onVideoClose = function(){
        var self = this;
        this.videoId = null;
        self.$elem.find("#localVideo").attr("src","");
        self.$elem.find("#remoteVideo").attr("src","");
        self.$callPanel.hide();
        self.inviteStop();
        //re-render all connections
        this.renderConnections();
    };

    mgVideoChat.prototype.inviteStart = function(connectionId){
        this.videoAnswerDialog(connectionId);
        this.videoInvitedId = connectionId;
        this.callRing(false);
    };

    mgVideoChat.prototype.inviteStop = function(){
        this.$answerDialog.modal('hide');
        this.videoInvitedId = null;
        this.callRing(true);
    };

    mgVideoChat.prototype.videoAnswerDialog = function(connectionId){
        var self = this;
        var userData = rtc.connections[connectionId].data.userData;
        self.$answerDialog.data('caller_id',connectionId);
        self.$answerDialog.find('.username').text(userData['name']);
        if(userData.image){
            self.$answerDialog.find('.desc').html('<img src="' + userData.image + '" alt="' + userData['name'] + '"/>');
        }
        self.$answerDialog.modal('show');
    };

    mgVideoChat.prototype.callRing = function(stop){
        var audio = this.$elem.find("#ringSound").get(0);
        if(stop){
            audio.pause();
        }
        else{
            audio.play();
        }
    };

    /**
     * Write to console if config.debug
     *
     */
    mgVideoChat.prototype.initRtc = function(){
        var self = this;
        //rtc events
        rtc.on('connected', function(){
            //connected now login
            rtc.login();
            self.onConnected();
        });
        //received local id
        rtc.on('connectionId', function(data) {
            self.connectionId = data.connectionId;
            self.userData = data.data.data.userData;
        });        
        //logged in
        rtc.on('logged', function(){
            self.onLogged();
        });
        
        //chat
        rtc.on('chat_message', function(data) {
            self.renderChatMessage(data.connectionId, data.connectionId, data.message);
            //pending message
            if(self.chatId != data.connectionId){
                if(!rtc.connections[data.connectionId]['data'].unread){
                    rtc.connections[data.connectionId]['data'].unread = 0;
                }
                rtc.connections[data.connectionId]['data'].unread ++;
                self.renderConnection(data.connectionId);
            }
        });

        //chat
        rtc.on('call_busy', function(data) {
            self.message('Callee is busy at the moment :(','danger',3);
        }); 

        rtc.on('connections', function(data){
            self.renderConnections();
        });

        rtc.on('connection_add', function(data) {
            self.renderConnection(data.connectionId);
        });

        rtc.on('connection_remove', function(data) {
            self.onConnectionClose(data.connectionId);
        });

        rtc.on('rstream_added', function(stream, connectionId){
            self.$elem.find("#remoteVideo").attr("src",window.URL.createObjectURL(stream));
            self.onVideoOpen(connectionId);
        });

        rtc.on('stream_added', function(stream, connectionId){
            self.$elem.find("#localVideo").attr("src",window.URL.createObjectURL(stream));
            self.onVideoOpen(connectionId);
        });

        rtc.on('media_request_start',function(){
            self.$elem.find('#requestDialog').modal('show');
        });

        rtc.on('media_request_end',function(){
            self.$elem.find('#requestDialog').modal('hide');
        });

        rtc.on('status',function(connectionId,status){
            switch (status) {
                case 'call_inviting':
                    self.callRing(false);
                    break;
                case 'call_invited':
                    //already in call?
                    if(self.videoId){
                        //send busy signal
                        rtc.busy(connectionId);
                        //drop call
                        rtc.drop(connectionId);
                    }
                    else{
                        self.inviteStart(connectionId);
                    }
                    break;
                case 'call_accepting':
                case 'call_accepted':
                    self.$videoPanel.data('call_id',connectionId);
                    self.inviteStop();
                    break;
                case 'idle':
                    self.callRing(true);
                    if(self.videoId == connectionId){
                        self.onVideoClose();
                    }
                    if(self.videoInvitedId == connectionId){
                        self.inviteStop();
                    }
                    break;
                default:
                    break;
            }
            self.renderConnection(connectionId);
        });

        rtc.on('socket_error',function(e){
            self.message('Error connecting to media server.','danger');
            self.onDisconnected();
        });

        rtc.on('socket_closed',function(e){
            self.message('Websocket closed, please try reloading page later.','danger');
            self.onDisconnected();
        });

        rtc.on('stream_error',function(e){
            self.message('Error getting local media stram.','danger');
        });

        rtc.on('pc_error',function(e){
            self.message('Error creating peer connection.','danger');
        });            
    };

    /**
     * Render Connections (Peers)
     */
    mgVideoChat.prototype.renderConnections = function(){
        var self = this;
        self.debug('connections');self.debug(rtc.connections);
        //load and parse templetes - first conns tpl
        this.loadTplByName('tplConnections', function(connTpl){
            var content = self.tmpl(connTpl, {
                rows:rtc.connections
            });
            self.$connectionsPanel.html(content);
            for ( var id in rtc.connections){
                self.renderConnection(id);
            }
            if(!rtc.connections.length){
                self.$connectionsPanel.find('#lonely').show();
            }
        });
    };

    /**
     * Render/Update an connection
     */
    mgVideoChat.prototype.renderConnection = function(connectionId){
        var self = this;
        this.getConnectionElement(connectionId, function($connEl){
            //conn exists
            var $existing = self.$connectionsPanel.find("#connection_" + connectionId);
            if($existing.length){
                $existing.replaceWith($connEl);
            }
            //new conn
            else{
                self.$connectionsPanel.find('#connections').append($connEl);
            }
            self.$connectionsPanel.find('#lonely').hide();
        })        
    }

    /**
     * Generate and return on callback a connection DOM
     */
    mgVideoChat.prototype.getConnectionElement = function(connectionId, callback){
        var self = this;
        if(!rtc.connections[connectionId]){
            return false;
        }
        //load and parse templete
        this.loadTplByName('tplConnection', function(connTpl){
            var connection = rtc.connections[connectionId],
                status = connection.status?connection.status:'idle';
            var data = {
                id: connectionId,
                status: status,
                userData: connection['data']['userData'],
                videoId: self.videoId,
                chatId: self.chatId,
                unread: (connection['data'].unread)?connection['data'].unread:0
            }

            var $content = $(self.tmpl(connTpl, data));
            //DOM
            $content.click(function(){
                self.$connectionsPanel.find(".connectionItem").removeClass('active');
                $(this).addClass('active');
                self.setChat($(this).data('connection_id'));
            });

            //button call
            $content.find(".call.cmdBtn").click(function(){
                rtc.invite($(this).data("id"), {
                    audio:true,
                    video:true
                });
            });
            $content.find(".callAudio.cmdBtn").click(function(){
                rtc.invite($(this).data("id"), {
                    audio:true,
                    video:false
                });
            });
            //button answer
            $content.find(".answer.cmdBtn").click(function(){
                self.debug("Clicked to answer the connectionId: " + $(this).data("id"));
                rtc.accept($(this).data("id"), {
                    audio:true,
                    video:true
                });
            });
            //button drop
            $content.find(".drop.cmdBtn").click(function(){
                self.debug("Clicked to drop the connectionId: " + $(this).data("id"));
                rtc.drop($(this).data("id"));
            });
            if(self.chatId == connectionId){
                $content.addClass('active');
            }
            callback($content);
        });
    };

    /**
     * get chat dom
     *
     * @param {int} chatId
     * @returns {undefined}
     */
    mgVideoChat.prototype.getChatDiv = function(chatId){
        var self = this;
        //get active chat
        var chat = this.$chatPanel.find('#chat_' + chatId);
        if(!chat.length){
            chat = $('<div id="chat_' + chatId + '" class="chat"><ul data-id="' + chatId + '" class="messages media-list"></ul><textarea data-id="' + chatId + '" class="form-control" rows="3" placeholder="Send a message ..."></textarea></div>');
            chat.appendTo(this.$chatPanel.find('#chats'));
            chat.find('textarea').keypress(function(e){
                var ta = $(this);
                if (e.keyCode === 13 && e.shiftKey) {
                    ta.val(ta.val() + "\n");
                    return false;
                }
                if (e.keyCode === 13) {
                    rtc.chatMessage(chatId,ta.val());
                    self.renderChatMessage(chatId, self.connectionId, ta.val());
                    ta.val('');
                    return false;
                }
            });
        }
        return chat;
    };
    
    /**
     * get chat dom
     * 
     * @param {int} chatId
     * @returns {undefined}
     */
    mgVideoChat.prototype.disableChat = function(chatId){
        //disable all
        if(!chatId){
            this.$chatPanel.find('.form-control').attr('disabled','disabled');
        }
        else{
            this.$chatPanel.find('#chat_' + chatId + ' .form-control').attr('disabled','disabled');
        }
    };    
    
    /**
     * Set active chat
     * 
     * @param {int} chatId
     * @returns {undefined}
     */
    mgVideoChat.prototype.setChat = function(chatId){
        this.chatId = chatId;      
        //hide all chats
        this.$chatPanel.find('.chat').hide();
        //get active chat
        this.getChatDiv(chatId).show();
        this.$chatPanel.find('.panel-title').text('Chat with ' + rtc.connections[chatId]['data']['userData']['name']);
        this.$chatPanel.show();
        //reset unread
        if(rtc.connections[chatId]['data'].unread){
            rtc.connections[chatId]['data'].unread = 0;
            this.renderConnection(chatId);
        }  
    };

    /**
     * Process chat message
     */
    mgVideoChat.prototype.parseChatMessageText = function(messageText){
        function nl2br (str, is_xhtml) {
            var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
            return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
        }
        function replaceURLWithHTMLLinks(text) {
            var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
            return text.replace(exp,"<a target=\"_blank\" href='$1'>$1</a>");
        }
        function linkify(inputText) {
            var replacedText, replacePattern1, replacePattern2, replacePattern3;
            //URLs starting with http://, https://, or ftp://
            replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
            replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');
            //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
            replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
            replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');
            //Change email addresses to mailto:: links.
            replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
            replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');
            return replacedText;
        }

        return nl2br(linkify(messageText),false);
    }
    
    /**
     * Render new message
     * 
     * @param {int} chatId
     * @param {int} fromId
     * @param {string} messageText
     * @returns {undefined}
     */
    mgVideoChat.prototype.renderChatMessage = function(chatId, fromId, messageText){
        var self = this;
        var chat = this.getChatDiv(chatId);
        this.loadTplByName('tplChat',function(tpl){
            var data = {
                "message": self.parseChatMessageText(messageText),
                "me": false
            };
            if(fromId === self.connectionId){
                data.me = true;
                data.userData = self.userData;
            }
            else{
                data.userData = rtc.connections[fromId]['data']['userData'];
            }
            var message = self.tmpl(tpl, data);
            var messages = chat.find('.messages');
            messages.append(message).scrollTop(messages.get(0).scrollHeight);
        });
    };    

    var cache = {};

    /**
     * Simple JavaScript Templating
     * John Resig - http://ejohn.org/ - MIT Licensed
     *
     */
    mgVideoChat.prototype.tmpl = function tmpl(str, data){
        // Figure out if we're getting a template, or if we need to
        // load the template - and be sure to cache the result.
        var fn = !/\W/.test(str) ?
        cache[str] = cache[str] ||
        tmpl(document.getElementById(str).innerHTML) :

        // Generate a reusable function that will serve as a template
        // generator (and which will be cached).
        new Function("obj",
            "var p=[],print=function(){p.push.apply(p,arguments);};" +

            // Introduce the data as local variables using with(){}
            "with(obj){p.push('" +

            // Convert the template into pure JavaScript
            str
            .replace(/[\r\t\n]/g, " ")
            .split("<%").join("\t")
            .replace(/((^|%>)[^\t]*)'/g, "$1\r")
            .replace(/\t=(.*?)%>/g, "',$1,'")
            .split("\t").join("');")
            .split("%>").join("p.push('")
            .split("\r").join("\\'")
            + "');}return p.join('');");

        // Provide some basic currying to the user
        return data ? fn( data ) : fn;
    };

    var tpls = {};
    
    /**
     * Load template by name
     */
    mgVideoChat.prototype.loadTplByName = function(tplName, callback){
        this.loadTpl(this.config.dir + this.config[tplName] + '?v=' + this.version, callback);
    };

    /**
     * Load template
     */
    mgVideoChat.prototype.loadTpl = function(url,callback){
        if(tpls[url] == null){
            $.get(url, function(data){
                tpls[url] = data;
                if(callback){
                    callback(data);
                }
            }, 'html');
        }
        else{
            if(callback){
                callback(tpls[url]);
            }
        }
        return tpls[url];
    };
       
    /**
     * Jquery entry function
     * 
     * @param {object} options
     * @param {object} params
     * @return {jQuery}
     */
    $.fn.mgVideoChat = function(options, params) {
        //just call existing instance
        if(options === 'methodName'){
            var customizer = $(this).data("mgVideoChat-instance");
            if(customizer){
                return customizer.methodName(params);
            }
        }        
        else{
            this.each(function() {
                return new mgVideoChat(this, options);
            });
        }
    };


    /**
     *  RTC implementation part
     *
     */
    var rtc = {firefox:false};

    rtc.init = function(config){
        rtc.config = config;
        if(navigator.mozGetUserMedia){
            rtc.firefox = true;
        }        
    }

    // Holds a connection to the server.
    rtc._socket = null;

    // Holds callbacks for certain events.
    rtc._events = {};

    //attach event handlers
    rtc.on = function(eventName, callback) {
        rtc._events[eventName] = rtc._events[eventName] || [];
        rtc._events[eventName].push(callback);
    };

    //fire event handler
    rtc.fire = function(eventName, _) {
        rtc.debug("fired [" + eventName + "]");
        var events = rtc._events[eventName];
        var args = Array.prototype.slice.call(arguments, 1);

        if (!events) {
            return;
        }
        //fire all handlers for this event
        for (var i = 0, len = events.length; i < len; i++) {
            events[i].apply(null, args);
        }
    };

    // Array of known peer socket ids
    /**

{
    id:{
        status: statuses,
        pc: PeerConnection,
        stream: localStream,
        data: customData,
        offerSdp: calledOffer
    }
}

    statuses:   statuses: idle, call_inviting, call_invited, call_accepting,
                call_accepted, sdp_offering, sdp_offered, sdp_answering,
                sdp_answered, call

    messages:   login, call_invite, call_accept, call_dropm
                sdp_offer, sdp_answer, ice_candidate
     */
    rtc.connections = {};

    rtc.id = null;

    rtc.compatible = true;

    /**
     * Write to console if config.debug
     *
     */
    rtc.debug = function(message){
        if(config.debug){
            console.log(message);
        }
    };

    rtc.checkCompatibility = function checkCompatibility(errors){
        rtc.compatible = true;
        if(!window.WebSocket){
            errors.websocket = true;
            rtc.compatible = false;
        }
        if(!window.RTCPeerConnection && !window.PeerConnection){
            errors.peerconnection = true;
            rtc.compatible = false;
        }
        if(!navigator.getUserMedia){
            errors.usermedia = true;
            rtc.compatible = false;
        }
        return rtc.compatible;
    }

    /**
     * Connects to the websocket server.
     */
    rtc.connect = function(server) {
        rtc._socket = new WebSocket(server);
        //after socket is opened
        rtc._socket.onopen = function() {
            rtc.fire('connected');
        };
        //ws on mesessage event
        rtc._socket.onmessage = function(msg) {
            var json = JSON.parse(msg.data);
            rtc.debug("RECEIVED MESSAGE " + json.type);
            rtc.debug(json);
            //fire proper event callback
            rtc.fire(json.type, json.data);
        };
        //ws error
        rtc._socket.onerror = function(err) {
            rtc.debug('onerror');
            rtc.debug(err);
            rtc.fire('socket_error', err);
        };
        //close our socket
        rtc._socket.onclose = function(data) {
            //fire external event
            rtc.fire('socket_closed', {});
        };
    };

    //emitted from server - obtain ws connections
    rtc.on('connections', function(data) {
        rtc.connections = data;
    });
    //received local id
    rtc.on('connectionId', function(data) {
        rtc.id = data.connectionId;
        rtc.fire('logged',data.data);
    });

    rtc.on('connection_add', function(data) {
        rtc.connections[data.connectionId]  = data.data;
    });

    rtc.on('connection_remove', function(data) {
        delete rtc.connections[data.connectionId];
    });

    rtc.on('call_invite', function(data) {
        rtc.setStatus(data.connectionId, 'call_invited');
    });

    rtc.on('call_accept', function(data) {
        if(rtc.refuseIdleState(data.connectionId)){
            return false;
        }
        rtc.setStatus(data.connectionId, 'call_accepted');
        //send sdp offer
        rtc.sdpOffer(data.connectionId);
    });

    rtc.on('call_drop', function(data) {
        rtc.stop(data.connectionId);
    });

    rtc.on('sdp_offer', function(data) {
        if(rtc.refuseIdleState(data.connectionId)){
            return false;
        }
        rtc.connections[data.connectionId].offerSdp = data.sdp;
        rtc.setStatus(data.connectionId, 'sdp_offered');
        rtc.sdpAnswer(data.connectionId);
    });

    rtc.on('sdp_answer', function(data) {
        if(rtc.refuseIdleState(data.connectionId)){
            return false;
        }
        var pc = rtc.connections[data.connectionId].pc;
        pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

        rtc.setStatus(data.connectionId, 'sdp_answered');
    });

    //received ice candidate
    rtc.on('ice_candidate', function(data) {
        if(rtc.refuseIdleState(data.connectionId)){
            return false;
        }
        var pc = rtc.connections[data.connectionId].pc;
        pc.addIceCandidate(new RTCIceCandidate({sdpMLineIndex:data.label, candidate:data.candidate}));
    });

    rtc.setStatus = function setStatus(connectionId,status){
        rtc.debug("status [" + status + "] for connectionId: " + connectionId);
        rtc.connections[connectionId].status = status;
        rtc.fire('status',connectionId,status);
    };

    rtc.refuseIdleState = function(connectionId){
        return rtc.connections[connectionId].status == 'idle';
    };

    rtc.send = function sendMessage(message){
        rtc.debug("SENDING MSG " + message.type);
        rtc.debug(message);
        rtc._socket.send(JSON.stringify(message));
    };
    
    rtc.chatMessage = function chatMessage(connectionId,messageText){
        rtc.send({
            type:"chat_message",
            data: {
                "connectionId": connectionId,
                "message": messageText
            }           
        });        
    };

    rtc.login = function loginMessage(userData){
        rtc.send({
            type:"login",
            data:userData
        });
    };

    rtc.invite = function callInvite(connectionId, opt){
        //create local media stream
        rtc.debug('creating local media stream');
        rtc.setStatus(connectionId,'call_inviting');
        rtc.createStream(connectionId, opt, function callInviteStream(stream){
            rtc.debug('inviting call for id: ' + connectionId);
            rtc.send({
                "type": "call_invite",
                "data": {
                    "connectionId": connectionId
                }
            });
        });
    };

    rtc.accept = function callAccept(connectionId, opt){
        //create local media stream
        rtc.debug('creating local media stream');
        rtc.createStream(connectionId, opt, function callAcceptStream(stream){
            rtc.debug('accepting call from id: ' + connectionId);
            rtc.send({
                "type": "call_accept",
                "data": {
                    "connectionId": connectionId
                }
            });
            rtc.setStatus(connectionId,'call_accepting');
        });
    };

    rtc.drop = function callDrop(connectionId){
        //drop call
        rtc.debug('droping call');
        rtc.send({
            "type": "call_drop",
            "data": {
                "connectionId": connectionId
            }
        });
        rtc.stop(connectionId);
    };

    rtc.busy = function callBusy(connectionId){
        //drop call
        rtc.debug('sending busy signal');
        rtc.send({
            "type": "call_busy",
            "data": {
                "connectionId": connectionId
            }
        });
    };

    rtc.stop = function pcStop(connectionId){
        if(rtc.connections[connectionId].pc){
            rtc.connections[connectionId].pc.close();
            rtc.connections[connectionId].pc = null;
        }
        if(rtc.connections[connectionId].stream){
            rtc.connections[connectionId].stream.stop();
        }
        rtc.setStatus(connectionId,'idle');
    };

    rtc.mergeConstraints = function(cons1, cons2) {
        var merged = cons1;
        for (var name in cons2.mandatory) {
            merged.mandatory[name] = cons2.mandatory[name];
        }
        merged.optional.concat(cons2.optional);
        return merged;
    }

    rtc.onCreateSessionDescriptionError = function(error) {
        rtc.debug('Failed to create session description: ' + error.toString());
    }

    rtc.extractSdp = function(sdpLine, pattern) {
        var result = sdpLine.match(pattern);
        return (result && result.length == 2)? result[1]: null;
    }

    // Set the selected codec to the first in m line.
    rtc.setDefaultCodec = function(mLine, payload) {
        var elements = mLine.split(' ');
        var newLine = new Array();
        var index = 0;
        for (var i = 0; i < elements.length; i++) {
            if (index === 3) // Format of media starts from the fourth.
                newLine[index++] = payload; // Put target payload to the first.
            if (elements[i] !== payload)
                newLine[index++] = elements[i];
        }
        return newLine.join(' ');
    }

    // Strip CN from sdp before CN constraints is ready.
    rtc.removeCN = function(sdpLines, mLineIndex) {
        var mLineElements = sdpLines[mLineIndex].split(' ');
        // Scan from end for the convenience of removing an item.
        for (var i = sdpLines.length-1; i >= 0; i--) {
            var payload = rtc.extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
            if (payload) {
                var cnPos = mLineElements.indexOf(payload);
                if (cnPos !== -1) {
                    // Remove CN payload from m line.
                    mLineElements.splice(cnPos, 1);
                }
                // Remove CN line in sdp
                sdpLines.splice(i, 1);
            }
        }

        sdpLines[mLineIndex] = mLineElements.join(' ');
        return sdpLines;
    }

    // Set |codec| as the default audio codec if it's present.
    // The format of |codec| is 'NAME/RATE', e.g. 'opus/48000'.
    rtc.preferAudioCodec = function(sdp) {
        if(!rtc.config.audio_receive_codec){
            return sdp;
        }
        var codec = rtc.config.audio_receive_codec;
        var fields = codec.split('/');
        //invalid
        if (fields.length != 2) {
            return sdp;
        }
        var name = fields[0];
        var rate = fields[1];
        var sdpLines = sdp.split('\r\n');

        // Search for m line.
        for (var i = 0; i < sdpLines.length; i++) {
            if (sdpLines[i].search('m=audio') !== -1) {
                var mLineIndex = i;
                break;
            }
        }
        if (mLineIndex === null)
            return sdp;

        // If the codec is available, set it as the default in m line.
        for (var i = 0; i < sdpLines.length; i++) {
            if (sdpLines[i].search(name + '/' + rate) !== -1) {
                var regexp = new RegExp(':(\\d+) ' + name + '\\/' + rate, 'i');
                var payload = rtc.extractSdp(sdpLines[i], regexp);
                if (payload)
                    sdpLines[mLineIndex] = rtc.setDefaultCodec(sdpLines[mLineIndex],
                        payload);
                break;
            }
        }

        // Remove CN in m line and sdp.
        sdpLines = rtc.removeCN(sdpLines, mLineIndex);

        sdp = sdpLines.join('\r\n');
        return sdp;
    }

    rtc.sdpOffer = function sdpOffer(connectionId) {
        var pc = rtc.createPeerConnection(connectionId);
        var constraints = rtc.mergeConstraints(rtc.config.offerConstraints, rtc.config.sdpConstraints);
        pc.createOffer( function(sessionDescription) {
            sessionDescription.sdp = rtc.preferAudioCodec(sessionDescription.sdp);
            pc.setLocalDescription(sessionDescription);
            rtc.send({
                "type": "sdp_offer",
                "data": {
                    "connectionId": connectionId,
                    "sdp": sessionDescription
                }
            });
        }, rtc.onCreateSessionDescriptionError, constraints);
        rtc.setStatus(connectionId,'sdp_offering');
    };

    rtc.sdpAnswer = function sdpAnswer(connectionId) {
        rtc.debug("Answering call connectionId: " + connectionId);
        var pc = rtc.createPeerConnection(connectionId);
        pc.setRemoteDescription(new RTCSessionDescription(rtc.connections[connectionId].offerSdp));
        // TODO: Abstract away video: true, audio: true for answers
        pc.createAnswer( function(sessionDescription) {
            sessionDescription.sdp = rtc.preferAudioCodec(sessionDescription.sdp);
            pc.setLocalDescription(sessionDescription);
            rtc.send({
                "type": "sdp_answer",
                "data":{
                    "connectionId": connectionId,
                    "sdp": sessionDescription
                }
            });
        }, rtc.onCreateSessionDescriptionError,rtc.config.sdpConstraints);
        rtc.setStatus(connectionId,'sdp_answering');
    };


    rtc.createStream = function createStream(connectionId, opt, onSuccess, onFail) {
        onSuccess = onSuccess || function(stream) {};
        onFail = onFail || function() {
            alert("Could not connect stream.");
        };

        try{
            rtc.fire('media_request_start');
            var media = $.extend({}, rtc.config.mediaConstraints, opt);
            navigator.getUserMedia(media, function(stream) {
                rtc.fire('media_request_end');
                //call dropped in the meantime
                if(rtc.refuseIdleState(connectionId)){
                    stream.stop();
                    return false;
                }
                rtc.connections[connectionId].stream = stream;
                onSuccess(stream);
                rtc.fire('stream_added',stream, connectionId);
            }, function(e) {
                rtc.fire('media_request_end');
                onFail(e);
                rtc.fire('stream_error', e);
            });
        }
        catch(e){
            rtc.fire('media_request_end');
            rtc.fire('stream_error', e);
        }
    };

    /**
     * Create new local peer connection for stream id
     */
    rtc.createPeerConnection = function createPeerConnection(connectionId) {
        rtc.debug('createPeerConnection for id: ' + connectionId);
        try{
            rtc.connections[connectionId].pc = new window.RTCPeerConnection(rtc.config.pcConfig,rtc.config.pcConstraints);
            rtc.connections[connectionId].pc.onicecandidate = function(event) {
                if (event.candidate) {
                    rtc.send({
                        "type": "ice_candidate",
                        "data": {
                            "candidate": event.candidate.candidate,
                            "connectionId": connectionId,
                            "label": event.candidate.sdpMLineIndex
                        }
                    });
                }
            };
        } catch (e) {
            rtc.debug("Failed to create RTCPeerConnection, exception: " + e.message);
            rtc.fire('pc_error', e);
            alert("Cannot create PeerConnection object; Is the 'PeerConnection' flag enabled in about:flags?");
            return null;
        }
        var pc = rtc.connections[connectionId].pc;

        pc.onconnecting = function () {
            rtc.debug("Session connecting.");
        };

        pc.onopen = function() {
            rtc.debug("Session opened.");
            // TODO: Finalize this API
            rtc.fire('pc_opened',connectionId);
        };

        pc.onaddstream = function(event) {
            rtc.debug("Remote stream added.");
            // TODO: Finalize this API
            rtc.fire('rstream_added', event.stream, connectionId);
            rtc.setStatus(connectionId,'call');
        };

        pc.onremovestream = function(){
            rtc.debug("Remote stream removed.");
        };

        pc.addStream(rtc.connections[connectionId].stream);

        return pc;
    };
    
})( jQuery, window , document );   // pass the jQuery object to this function

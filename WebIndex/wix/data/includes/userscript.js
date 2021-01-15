//jQuery Objectの指定. jQuery190 → version1.9.0
(function($){
var ExtensionU = (function(){
    var _browser = (function(){
            if(window.navigator.userAgent.indexOf("Chrome")!= -1){
                return 'Chrome';
            }else if(window.navigator.userAgent.indexOf("Safari")!= -1){
                return 'Safari';
            }else if(window.navigator.userAgent.indexOf("Opera")!= -1){
                return 'Opera';
            }else if(window.navigator.userAgent.indexOf("Firefox")!= -1){
                return 'Firefox';
            }else{
                return 'Unknown';
            }
        }());

    return {
        Status : {
            browser : _browser
        },
        Message : {
            connection : function(){//コンストラクタ
                this.listeners = {};
                var that = this;
                var callback = function(message)  {
                    if (message && message.name && that.listeners[message.name]) {
                        that.listeners[message.name](message.data);
                    }
                }
                if (_browser == 'Chrome') {
                    this.port = chrome.extension.connect({ name: 'message' });
                    this.port.onMessage.addListener(callback);
                    chrome.extension.onConnect.addListener(function(port) {
                        if (port.name == 'message') {
                            port.onMessage.addListener(callback);
                        }
                    });
                }
                else if (_browser == 'Safari') {
                    safari.self.addEventListener('message', function(event) {
                        callback({ name: event.name, data: event.message })
                    });
                }
                else if (_browser == 'Firefox') {
                    window.addEventListener('message', function(event) {
                        if(event.origin == 'chrome://browser'){
                            callback({ name: event.data.name, data: event.data.data })
                        }
                    });
                }else if (_browser == 'Opera') {
                    opera.extension.addEventListener('message', function(event) {
                        callback(event.data)
                    });
                }
            },
            singleRequest : {
                send : function(){
                },
                listener : function(name, fn){
                    if(ExtensionU.Status.browser == "Chrome"){
                        chrome.extension.onRequest.addListener(
                            function(request, sender, sendResponse){
                                fn(request);
                                sendResponse({});
                            }
                        )
                    }else if(ExtensionU.Status.browser == "Safari"){
                        safari.self.addEventListener(
                            'message',
                            function(evt){
                                if(evt.name == name){
                                    fn(evt.message);
                                }
                            },
                            false
                        )
                    }else if(ExtensionU.Status.browser == "Firefox"){
                        window.addEventListener(
                            "message",
                            function(evt){
                                if(evt.data.name == name){
                                    fn(evt.data);
                                }
                            },
                            false
                        )
                    }else if(ExtensionU.Status.browser == "Opera"){

                    }
                }
            }
        },
        Event : {
            ready : function(){},
            DOMContentLoaded : function(){},
        },
        View : {
            html : {},
            native : {},
        }
    }
}());
ExtensionU.Message.connection.prototype.send = function(name, data, callback) {
    this.listeners[name] = callback || function() {}
    if (ExtensionU.Status.browser=='Safari') {
        safari.self.tab.dispatchMessage(name, data);
    }
    else if (ExtensionU.Status.browser=='Chrome'){
        this.port.postMessage({ name: name, message: data })
    }
    else if (ExtensionU.Status.browser=='Firefox') {
        var req = {name : name, message : data},
            event;

        event = new MessageEvent('ext_message', {
            data: req,
            origin: window.location,
            source: window
        })
        window.dispatchEvent(event);

    }else if (ExtensionU.Status.browser=='Opera'){
        var req = {name : name, message : data}
        opera.extension.postMessage(req)
    }
}
ExtensionU.Message.connection.prototype.addListener = function(name, callback) {
    this.listeners[name] = callback
}

var Util = {};
Util.isBlank = function(str){
    return (!str || /^\s*$/.test(str));
};
Util.serealize = function(obj){
    return JSON.stringify(obj);
};
Util.deserealize = function(obj){
    return JSON.parse(obj);
};
Util.escapeUTF8 = function(str){
    return str.replace(/[^*+.-9A-Z_a-z-]/g,function(s){
        var c=s.charCodeAt(0);
        return (c<16?"%0"+c.toString(16):c<128?"%"+c.toString(16):c<2048?"%"+(c>>6|192).toString(16)+"%"+(c&63|128).toString(16):"%"+(c>>12|224).toString(16)+"%"+(c>>6&63|128).toString(16)+"%"+(c&63|128).toString(16)).toUpperCase()
    })
};

/**
 * @constructor
 */
function DOMNodeBinder(){
    var _counter = 0,
        _nodeArry = [],
        _nodeValueArry =[]

    return {
        push : function(obj$){
            _nodeArry[_counter] = obj$;
            //テスト用に値を変更して保存
            _nodeValueArry[_counter] = obj$.nodeValue;
            _counter++;
        },
        get : function(bindId){
            return _nodeArry[bindId];
        },
        getValueArray :function(){
            return _nodeValueArry;
        }
    }
}

/**
 * @constructor
 */
function Attacher(){
    //private
    var self = this,
        _attachType,
        _reqParams = {
            rewriteAnchorText : '',
            wid : '',
            minLength : '',
            body : '',
            uid : '',
        }

    this._obj$ToSerializedArray = function(obj$){
        self.dnb = new DOMNodeBinder();
        self.searchTextNodes(obj$, self.dnb);
        return Util.serealize(self.dnb.getValueArray());
    }
    this.setParameter = function(key, value){
        if(key == 'body'){
            if(typeof value == 'object'){
                value = self._obj$ToSerializedArray(value)
                _attachType = 'object'
            }else{
                _attachType = 'string'
            }
        }
        _reqParams[key] = value;
    }
    this.getParameter = function(key){
        return _reqParams[key];
    }
    this.getAttachType = function(){
        return _attachType;
    }
};
Attacher.prototype = {
    setParameters : function(obj){
        for (var key in obj){
            this.setParameter(key, obj[key])
        }
    },
    /**
     * @method attach
     * サーバーとAjax通信.
     * @param {Function} [callback] 通信成功時に行う処理を追加.
     */
    attach : function(callback){
        var self = this

        var req = {
            minLength: this.getParameter('minLength'),
            bookmarkedWIX: this.getParameter('wid'),
            rewriteAnchorText: this.getParameter('rewriteAnchorText'),
            body : Util.escapeUTF8(this.getParameter('body')),
            attachType : this.getAttachType()
        }

        connection.send(
            'Attach',
            req,
            function(data){
                if(data == 'error'){
                    if(callback){
                        callback(data, 'error');
                    }
                } else {
                    if(self.getAttachType() == 'object'){
                        data = Util.deserealize(data);
                    }
                    self.rewrite(data);
                    self.popup();
                    if(callback){
                        callback(data, 'success');
                    }
                }
            }
        )
    },
    /**
     * @method rewrite
     * 引数の型で処理を分岐
     * @param {Object} [attachedObj] StringまたはKey-Value型
     */
    rewrite : function(attachedObj){
        if(typeof attachedObj == 'string'){
            $("body")[0].innerHTML = attachedObj;
        }else{
            for (var i = 0, max = attachedObj.length; i < max; i++){
                var res = attachedObj[i],
                    node = this.dnb.get(res.index);
                $(node).before(res.newBody);
                $(node).remove();
            }
        }
    },
        /**
     * @method popup
     */
    popup : function(){
        var target_items = $("a.wix-decide");
        $(target_items).each(function(i){
            var my_tooltip = $("<div/>",{
                class: 'wix-tooltip',
                id: 'tooltip'+i,
                text: 'The links of '+target_items[i].innerHTML
            });

            my_tooltip.append($("<p/>").append(setContent(target_items[i])));

           $("body").append(my_tooltip);

            $(this).mouseover(function(){
                my_tooltip.css({opacity:0.85, display:"none"}).fadeIn(400);
            }).mouseenter(function(){
                setPopup($(this), my_tooltip);
            })

            my_tooltip.mouseleave(function(){
                my_tooltip.css({left:"-9999px"});
            });

            function setPopup(ele, my_tooltip) {
                var border_top = $(window).scrollTop();
                var border_right = $(window).width();
                var left_pos;
                var top_pos;
                var left_offset = 5;
                var top_offset = 0;
                if(border_right - (left_offset *2) >= ele.offset().left){
                    left_pos = ele.offset().left+left_offset;
                    } else{
                    left_pos = border_right-left_offset;
                    }
                if(border_top + (top_offset *2)>= ele.offset().top){
                    top_pos = border_top +top_offset;
                } else{
                    top_pos = ele.offset().top-top_offset;
                }
                my_tooltip.css({left:left_pos, top:top_pos});
            }

            function setContent(target) {
                var table = document.createElement("table");
                var links = JSON.parse(target.getAttribute('links'));
                var bookmarkedWIX = target.bookmarkedWIX;

                for ( var i in links) {
                    var splitData = links[i].split("-");
                    var wid = splitData[0];
                    var eid = splitData[1];
                    var keyword = splitData[2];
                    for ( var i = 3; i < splitData.lenght; i++) {
                        keyword+="-"+splitData[i];
                    }
                    var tr = $("<tr/>").append(
                        $("<td/>").append(
                            $("<a/>",
                            {
                                class: 'wix-link',
                                href: 'javascript:void(0)',
                                wid: wid,
                                eid: eid,
                                bookmarkedWIX: bookmarkedWIX,
                                text: keyword,
                            })
                        )
                    ).appendTo(table);
                }
                return table;
            }
        });
    },
    /**
     * @method searchTextNodes
     * @param {Object} obj$ jQueryObject
     * @param {DOMNodeBinder} binder
     */
    searchTextNodes : function(obj$ ,binder){
        var contents = obj$.contents(),
            self = this;

        if(contents != undefined){
            contents.each(function(index, elt){
                if(elt.nodeType == 3 && !Util.isBlank(elt.nodeValue)){
                    binder.push(elt)
                }
                else if(elt.nodeType == 1
                    /* 取得したくないノードを列挙 */
                    && elt.nodeName != 'A'
                    && elt.nodeName != 'STYLE'
                    && elt.nodeName != 'IFRAME'
                    && elt.nodeName != 'SCRIPT'
                    && elt.nodeName != 'NOSCRIPT'){
                        self.searchTextNodes.call(self, $(elt), binder)
                }
            })
        }
    }
}

function Redirector(){

    var self = this,
        _wtid,
        _eventTarget;

    $(document).on('click','.wix-link', function(e){
        e.preventDefault();
        self.setEventTarget(e.target);
        self.open();
    })

    this.setWtId = function(wtid){
        $('.wix-broad-attach').removeClass('clicked')
        _wtid = wtid;
    }
    this.setEventTarget = function(eventTarget){
        _eventTarget = eventTarget;
    }

    this.open = function(){
        if(_wtid){
            var keyword = Util.escapeUTF8(_eventTarget.innerHTML);
            window.open(Constant.URL.Redirector + '?keyword=' + keyword + '&wtid=' + _wtid);
            //window.open(_broadAttachPath + keyword);
        }else{
            var wid = _eventTarget.getAttribute('wid'),
                eid = _eventTarget.getAttribute('eid');

            if(wid && eid){
                window.open(Constant.URL.Redirector + '?wid=' + wid + '&eid=' + eid, '_blank');
            }
        }
        return false;
    }
}

function WixUClass(params){
    this.name = params.name;
    this.type = params.type;
    this.status = params.status;
    this.function = params.function;
    WixU.option.addOption(this.name, params.option);
    //Set initialize method
    WixU.init.set(params.init);
    WixU.init.addEventListener(params.initEventListener);
};

var Constant = {
    URL : (function(){
        var _origin = 'http://wixdev.db.ics.keio.ac.jp',//or wixdemo.dbで
            _app = '/sena_WIXServer_0.5.3',
            _publicFolder,
            _addon = '/download'

        if(ExtensionU.Status.browser == "Chrome"){
            _publicFolder = chrome.extension.getURL('') + 'data/public';
            _addon = _addon + '/wix.crx'
        }else if(ExtensionU.Status.browser == "Safari"){
            _publicFolder = safari.extension.baseURI + 'data/public';
            _addon = _addon + '/wix.safariextz'
        }else if(ExtensionU.Status.browser == "Firefox"){
            _publicFolder = 'chrome://WIX.safariextension/content/public';
            _addon = _addon + '/wix.xpi'
        }else if(ExtensionU.Status.browser == "Opera"){
            _publicFolder = _origin + _app + '/public';
            _addon = _addon + '/wix.oem'
        }else{
            _publicFolder = _origin + _app + '/public';
        }

        return {
            Redirector : _origin + _app + '/redirector',
            PublicFolder : _publicFolder,
            Addon : _origin + _app + _addon
        }
    })(),
}

var redirector = new Redirector(),
    connection = new ExtensionU.Message.connection()

var WixU = {
    status : {
    },
    key : {
        shift : false
    },
    option : (function(){
        var _conditions = {}

        return {
            set : function(objName, params){
                var connection = new ExtensionU.Message.connection();
                connection.send(
                    "Set" + objName + "Option", params, null
                )
            },
            get : function(objName, key){
                return _conditions[objName][key]()
            },
            addOption : function(objName, keyfn){
                _conditions[objName] = {};
                for (var key in keyfn){
                    if(keyfn.hasOwnProperty(key)){
                        _conditions[objName][key] = keyfn[key]
                    }
                }
            }
        }
    })(),
    function : {
        insertJS : function(Url){
            if(document.getElementById(Url+"-js") == null){
                var script = document.createElement("script");
                script.type = "text/javascript";
                script.setAttribute("id", Url+"-js");
                script.src = Constant.URL.PublicFolder + '/js/' + Url + '.js';
                var head = document.getElementsByTagName("head")[0];
                head.appendChild(script);
            }
        },
        insertCSS : function(Url){
            if(document.getElementById(Url+"-css") == null){
                var link = document.createElement("link");
                link.rel = "stylesheet";
                link.setAttribute("id", Url+"-css");
                link.href = Constant.URL.PublicFolder + '/css/' + Url + '.css';
                var head = document.getElementsByTagName("head")[0];
                head.appendChild(link);
            }
        },
    },
    init : (function(){
        var _callback = [],
            _listeners = []

        return {
            exec : function(){
                connection.send(
                    'Initialize',
                    {},
                    function(data){
                        var i = 0,max = _callback.length
                        for (; i<max; i++){
                            _callback[i](data);
                        }
                        WixU.init.eventListener();
                    }
                )
                return true;
            },
            set : function(fn){
                _callback.push(fn);
            },
            eventListener : function(){
                var i = 0,max = _listeners.length
                for (; i<max; i++){
                    _listeners[i]();
                }
            },
            addEventListener : function(fn){
                _listeners.push(fn);
            }
        }
    })()
}

WixU.main = new WixUClass({
    name : 'Main',
    type : 'core',
    option : {
        minLength : function(){
            return $('#wix-min-length-input').val();
        },
        loginOmission : function(){
            return $('#wix-login-omit:checked').val();
        }
    },
    function : {
        attach : function (wid, minLength){
            var start = new Date().getTime(),finish;

            $("#loading").empty();
            $("#loading").html('<img src="'+ Constant.URL.PublicFolder + '/img/loading.gif' +'"/>');

            $('.wix-link').each(function(){
                $(this).replaceWith(this.innerHTML)
            })

            $('.wix-decide').each(function(){
                var txt = $(this).text();
                $(this).after(document.createTextNode(txt));
                $(this).remove();
            })

            $('.wix-tooltip').each(function(){
                $(this).remove();
            })

            var atc = new Attacher();

            atc.setParameter('wid' , wid);
            atc.setParameter('uid' , WixU.status.id);
            atc.setParameter('minLength' , minLength);
            atc.setParameter('rewriteAnchorText' , WixU.key.shift);
            if(WixU.key.shift){
                atc.setParameter('body', document.getElementsByTagName('body')[0].innerHTML)
            }else {
                atc.setParameter('body', $('body'))
            }

            atc.attach(function(data, status){
                $("#loading").empty();

                finish = new Date().getTime();

                if (status == 'success'){
                    $("#loading").html('Attached : ' + (finish - start)/1000 + ' 秒');
                } else {
                    $("#loading").html('Attach Failed');
                }
            })
        },
        setEventListener : function(){
            $('.wix-attach').on('click', function(e) {
                redirector.setWtId('')
                WixU.main.function.attach(e.target.getAttribute('wid'), WixU.option.get('Main', 'minLength'));
            });
            $('.wix-broad-attach').on('click', function(e) {
                redirector.setWtId(e.target.getAttribute('wtid'))
                $(e.target).addClass('clicked');
                WixU.main.function.attach(e.target.getAttribute('wid'), WixU.option.get('Main', 'minLength'));
            });
            $(document).on('keydown',function(e){
                if(e.shiftKey){
                    WixU.key.shift = true;
                }
            });
            $(document).on('keyup',function(e){
                WixU.key.shift = false;
            })
            $("#wix-body").hover(function(){
                    $(this).addClass("hover")
                },function(){
                if($(this).hasClass("hover")){
                    $(this).removeClass("hover")
                }
            })
            $('#wix-min-length-input').change(function(){
                    connection.send(
                        'SetMainOption',
                        {'minLength' : $(this).val()},
                        null
                    )
                }
            )
            $('#wix-logo-img').click(
                function(){
                    $('#wix-body').toggleClass('close')
                    connection.send(
                        'SetMainOption',
                        {'toolbar' : $('#wix-body').hasClass('close')},
                        null
                    )
                }
            )
            $('#wix-option-button').click(function(){
                connection.send('VersionCheck', '', function(res){
                    if(res){
                        $('#wix-version-status').html('<a href="' + Constant.URL.Addon + '">Update to the latest version of WIX</a>.')
                    } else {
                        $('#wix-version-status').html('You\'re using the latest version of WIX')
                    }
                })
            })

            $('.wix-attach-off').on('click',function(){
                $('.wix-link').contents().unwrap();
                $('.wix-decide').contents().unwrap();
            });

        },
        appendView : function(view){
            $('html').append(view);
        },
        replaceView : function(view){
            if(view.status == 'error'){
                alert('Login Error!');
                return;
            }
            $('#wix-logo, #wix-body').remove();
            $('html').append(view.data);
            WixU.init.eventListener();
        }
    },
    init : function(res){
        if(!document.getElementById('wix-body')){
            WixU.function.insertCSS('wix');
            // WixU.function.insertJS('pop_up');
            WixU.main.function.appendView(res.data);
            WixU.status.id = res.id;
            ExtensionU.Message.singleRequest.listener('SyncView', WixU.main.function.replaceView);
       }
    },
    initEventListener : function(){
        WixU.main.function.setEventListener();
    }
})

if(ExtensionU.Status.browser == 'Opera'){
    window.document.addEventListener('DOMContentLoaded', function(event){
        WixU.init.exec()
    }, false);
} else if (window.top === this){
    WixU.init.exec()
}

})(window.jQuery190)
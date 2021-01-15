var Extension = (function(){
    var _browser = (function(){
            if(window.navigator.userAgent.indexOf("Chrome")!= -1){
                chrome.extension.onConnect.addListener(function(port) {
                    port.onMessage.addListener(function(req, con){
                        Extension.Message.controller(req, con)
                    });
                });
                return 'Chrome';
            }else if(window.navigator.userAgent.indexOf("Safari")!= -1){
                safari.application.addEventListener("message", function(req, con){
                    Extension.Message.controller(req, con)
                }, false);
                return 'Safari';
            }else if(window.navigator.userAgent.indexOf("Opera")!= -1){
                opera.extension.addEventListener("message", function(req, con){
                    req.name = req.data.name;
                    req.message = req.data.message;
                    Extension.Message.controller(req, con);
                }, false);
                return 'Opera';
            }else if(window.navigator.userAgent.indexOf("Firefox")!= -1){
                // gBrowser.addEventListener("ext_message", function(evt){
                //     var con = evt.currentTarget.contentWindow
                //     Extension.Message.controller(evt.data, con);
                // }, false, true);

                gBrowser.addEventListener('DOMContentLoaded',function(e){
                    if(e.target.documentURI == window.content.document.location.href){
                        e.currentTarget.contentWindow.addEventListener('ext_message', function(evt){
                            var con = evt.currentTarget;
                            Extension.Message.controller(evt.data, con);
                        }, true);
                    }
                })

                return 'Firefox';
            }else{
                return 'Unknown';
            }

        })()
    return {
        Status : {
            browser : _browser
        },
        Storage : {
            localStorage : {
                init : function(reqValues){
                    var list ={};
                    for (var key in reqValues){
                        if(reqValues.hasOwnProperty(key)){
                            if(_browser == 'Firefox'){
                                var hw_prefs=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
                                var hw_Branch=hw_prefs.getBranch("extensions.wix.");
                                list[key] = JSON.parse(hw_Branch.getCharPref(key));
                            }else{
                                if(!localStorage[key]){
                                    localStorage[key] = JSON.stringify(reqValues[key]);
                                }
                                list[key] = JSON.parse(localStorage[key]);
                            }
                        }
                    }
                    return list;
                },
                get : function(key){
                    if(_browser == 'Firefox'){
                        var hw_prefs=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
                        var hw_Branch=hw_prefs.getBranch("extensions.wix.");
                        return JSON.parse(hw_Branch.getCharPref(key));
                    }else{
                        return JSON.parse(localStorage[key])
                    }
                },
                set : function(key, saveValues){
                    if(_browser == 'Firefox'){
                        var hw_prefs=Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
                        var hw_Branch=hw_prefs.getBranch("extensions.wix.");
                        hw_Branch.setCharPref(key, JSON.stringify(saveValues));
                    }else{
                        localStorage[key] = JSON.stringify(saveValues);
                    }
                }
            },
            cache : {

            }
        },
        Message : (function(){
            var _send = (function(){
                if(_browser == 'Safari'){
                    return function(req, con, response){
                        req.target.page.dispatchMessage(req.name, response);
                    }
                }else if(_browser == 'Chrome'){
                    return function(req, con, response){
                        con.postMessage({ name: req.name, data: response });
                    }
                }else if(_browser == 'Firefox'){
                    return function(req, con, response){
                        con.postMessage({name: req.name, data:response }, '*');
                    }
                }else if(_browser == 'Opera'){
                    return function(req, con, response){
                        req.source.postMessage({name: req.name, data:response })
                    }
                }
            })(),
            _conditions = {},
            _controller = function(req, con){
                _conditions[req.name](req, con);
            },
            _addConditions = function(keyValues){
                for (var key in keyValues){
                    if(keyValues.hasOwnProperty(key)){
                        _conditions[key] = keyValues[key]
                    }
                }
            }
            return {
                send : _send,
                controller : _controller,
                addControllerConditions : _addConditions
            }
        }()),
        Network : {

        },
        UI : (function(){
            //private function
            var _createElement = function(tagName, params, innerText){
                var node = window.document.createElementNS("http://www.w3.org/1999/xhtml", tagName);
                node.setAttr(params);
                if(innerText){
                    node.innerHTML = innerText;
                }
                return node;
            }
            return {
                docToHTML : function(doc, id){
                    var _id = id || 'temp';
                    return doc.getElementById(_id).innerHTML
                },
                createElement : _createElement,
                createRadioGroup : function(groupClass, optionClass, name, title, labelName, value){
                    var i = 0, max = labelName.length,
                        group = _createElement('div', {
                            'class': groupClass + '-group'
                        }),
                        title = _createElement('div', {
                            'class': groupClass + '-title'
                        }, title);

                    group.append(title);

                    for(; i < max; i++){
                        var div = _createElement('div'),
                            input = _createElement('input', {
                                'id' : name + i,
                                'name' : name,
                                'type' : 'radio',
                                'value' : i,
                                'class' : groupClass + '-' +optionClass
                            }),
                            label = _createElement('label', {
                                'for': name + i
                            }, labelName[i]);

                        if(i == value){
                            input.setAttr({'checked': 'checked'})
                        }
                        div.appendChilds([input, label]);
                        group.append(div);
                    }
                    return group
                },
                createSearchForm : function(name){
                    var input = _createElement('input', {
                            'id': name + '-input',
                            'type': 'search',
                            'value': '',
                            'accesskey': 's',
                            'placeholder': 'Search word'
                        }),
                        output = _createElement('output', {
                            'id': name + '-output'
                        }),
                        body = _createElement('span', {
                            'id': name
                        })
                    return body.appendChilds([input, output]);
                },
                createSlider : function(name, min, max, step, value){
                    //inputParams -> min, max, step, value
                    var input = _createElement('input', {
                            'id' : name + '-input',
                            'type' : 'range',
                            'min' : min,
                            'max' : max,
                            'step' : step,
                            'value' : value,
                            'onChange' : 'document.getElementById("' + name + '-output' +'").innerHTML=this.value'
                        }),
                        output= _createElement('output', {
                            'id': name + '-output'
                        }, value),
                        body = _createElement('span', {
                            'id' : name
                        })
                    return body.appendChilds([input, output]);
                },
                createPopup : function(name, contents){
                    var mainId = name + '-popup',
                        dummyId = mainId + '-dummy',
                        dummy = _createElement('div',{
                            'id': dummyId,
                            'onclick':"(function(){if(event.target.id=='" + dummyId + "'){event.target.style.display = 'none';}})()"
                        }),
                        main = _createElement('div',{
                            'id': mainId
                        });

                    main.appendChilds(contents)

                    return dummy.append(main);
                },
                createListItem : function(name, params){
                }
            }
        }()),
        tabs : {
            currentTab : function(){

            },
            allTabs : function(){

            }
        }
    }
}());
Element.prototype.append = function(child){
    this.appendChild(child);
    return this;
}
Element.prototype.appendChilds = function(childs){
    var i=0, max = childs.length;
    for(; i<max; i++){
        this.append(childs[i])
    }
    return this;
}
Element.prototype.setAttr = function(params){
    for (var key in params){
        if(params.hasOwnProperty(key)){
            this.setAttribute(key, params[key])
        }
    }
    return this;
}

function WIXClass(params){
    var option = {};
    this.name = params.name;
    this.type = params.type;
    option[this.name] = params.option;
    this.function = params.function;
    //viewの設定
    for (var key in params.view){
        if(params.view.hasOwnProperty(key)){
            if(key == 'login'){
                Wix.view.addLoginView(params.view[key])
            }else if(key == 'notLogin'){
                Wix.view.addNotLoginView(params.view[key])
            }else if(key == 'option'){
                Wix.view.addOptionView(params.view[key])
            }
        }
    }
    //option初期化
    Wix.option.init(option);
    function setOption(o) {
        return function(optionParams){
            Wix.option.set(o.name, optionParams.message);
            if(o.function.changeOption){
                o.function.changeOption(optionParams.message);
            }
        };
    }
    this.function["Set"+this.name+"Option"] = setOption(this);
    Extension.Message.addControllerConditions(this.function)
};

function VersionManager(nowVersion){
    var _latestVersion,
        _localVersion = nowVersion;

    this.checkUpdate = function(){
        $.ajax({
            async : true,
            url : Constant.URL.Version,
            type : 'POST',
            success : function(latestVersion){
                _latestVersion = latestVersion.trim();
            },
            error : function(){

            }
        });
    }
    this.isNewVersion = function(){
        console.log(_latestVersion);
        if(_latestVersion > _localVersion){
            return true
        } else {
            return false
        }
    }
}

var Constant = {
    Version : '0.7.1',
    URL : (function(){
        var _origin = 'http://wixdev.db.ics.keio.ac.jp',
            _app = '/sena_WIXServer_0.5.3'

        return {
            LAB : 'http://www.db.ics.keio.ac.jp',
            HP : 'http://kwix.jp',
            Login : _origin + _app + '/login',
            AutoLogin : _origin + _app + '/autologin',
            Logout : _origin + _app + '/keygen',
            Attach : _origin + _app + '/attach',
            ObjectAttach : _origin + _app + '/objattach',
            Version : _origin + _app + '/version',
            Keygen : _origin + _app + "/keygen"
        }
    })(),
    Logo : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAjCAMAAADha6m9AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyRpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGNThGNzJCNjNCQTkxMUUzODBDQThFNTRCQzJGQTYxRSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGNThGNzJCNzNCQTkxMUUzODBDQThFNTRCQzJGQTYxRSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjE0ODY1QjYxM0IzMjExRTM4MENBOEU1NEJDMkZBNjFFIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjE0ODY1QjYyM0IzMjExRTM4MENBOEU1NEJDMkZBNjFFIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+xRX/vQAAAwBQTFRF4uHg7fL6H1Km+rrU/u42Y4S6AKNsJFao9fb2KFmp86PFiqXS19jYWTGWa4q81eDx//hZssXi1NrxzdDWGU2kGiwuk6zV5OLh2NjY8fHxdpbK4N/d3t7et6Sv8vX64Oj04N7bnLPZobHK5eTinK7JOmi0z9vuMmGuVCqMYYXBVXy8Qm2zyc7V+vr65ubmIlWo/ewA4+r2Wn636e76elil++UA5u33SnO1+Pj4jqPFucrl8/DsKjo6tMDRVy6P2eLy6Ojoao3FwNDo/8zkcI29+Pv+r7rC6+vr3dzb7+7vdpK/Fkuisr/RUHi6rsHh2tra5OHdfZzNG1Cm8vP1IFSn6OXjyNb1xM3bPGev85S25OTkLF2r9m6GLFyr4un1ucLR5OLe/OcAGk+kr7vO8Ym3RnG2393a0NzvZorDNGKtq7jN7OzsTne5pbTMO7+T5uPf4ODfgJ7O/f//+vz/eZnMNmSuHFCl3+f0IVSnrLnOfZvM09XYH1Om/qLHp7zehZzDUymVzdntsr3PXIG/rbnNWoC+WH69iGiuHVGmeJjLPmy3K12uJ1mp////J1ipJlip/f39JlmpI1an/Pz8JVio/v7+4uDd6uno8vDr4uDcz97v4+Dc4+Hdq7/f/P3/ydHQ5Ov3w8nU5eLdwMfT9Pf9397cepXA++MAnoK8YIK50PLm3N7hZG5p8okr/9FJ8toA6OTewq/V3+j2v6nRJ1mq967H9KjJyNXrT3a00NPXWHy28u/rR8SaXsujutDo2sRXKlusK1yq7u3tcZHI49Tp4s18XITAx6sx4uz1/+dimHvCzNTTV2JfV2Nhb0l35/f07fT0JVisYDmU6Ofl/qXJMGCt6enp6+romHu4rbjAEUeg7EZggmKwzt34hWFn4d/c29va8PX7+8DQnrjc5OHe1MfOfJrM7OXzpLPf2+Ty2+X0x9X16jRhddaz+cgPhqLQ7evpjqjTybvD2dnZ8Gw75+fnztruOGWvkeDC9PLtw8nTx83Rx8zV4+Hc9fj9////kFhr9gAAAQB0Uk5T////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AFP3ByUAAARmSURBVHjajJR5WBNHGMbXpbhZiCASG5C2XGkjgXUpCgoUuUswNaRRqyYKJRQKLYfYEhdIvaAY6+xuTEgQxduo9D5sq/by6GHvllZ6N9Baex/UpvTGmQ1HAHns+8e3z/N+85v5ZuabxQYmki1P2nGuQzor1DYmgU0AULoOZ3Bac8l+sQbLZ/8PcqejR5ZQwdPWk7EH92p01OWRbk3RURwneI7jabN+nTJMdDkkv71qJQ4GRRLGTrHTNhHCsnYYRTvqAU2CEWk7lTr2kgiVEV1TIw21YcH9jDcBgHGda9GlEJFTWSSrCtas0uSYRxOAWLlfyo5HRBF7j/P44rrkmr9OtgKAm6G4of2Yc1yicYjdGbfMzANA4wsCTCRH+KvV6kg9P8hY+4PzxyEiZ4BWKIdjCAD4E0sffPONv+8jhkqj65ewY5FTcfKhPCyH33LTDdOnfzSCmJPP2cci76W1bh3ZL78lDSI3eiEH91GjESq/pojnhwluGOEGZV7waB7lhdjzHI5G2RFuGKFN7wqFXYszg5L4ih0d3ZYhhMJczZ11/AiB902b1vv67t3vfPb9LVDbobIq5L7NLszmQShlSACNEyMErz/z43NfZWdnf/HqVKiXXjt8+MMXv1ThdI44zIYQi1R8XMt73zUec//kyVff4+d320Pxhw4VP/LW+vkz51xTyvDaBLHUApG89hzt6PYwfPMHRN73e2r5Jz/FJxbHvzKlq2vmE88b4bnltOcNYJb2EivPmLyE44HVnlWW//BbcWJiYvHn66fM7/r6ZRzwxEaHHQuN6DSTCxVQLU1NLQrFvU0tp99+trr6Vx8fnydXrHj4CqgXPt20ac5jgTRHmn0jRNgseOv07yzUpPDwXJZNKgzPzV1TWHgXy65efebx2azdLqSS2EiGA0RFcBsmLbECQx9C1prOFrLsaRqk9zF68nbo7JGT8nSUCmKYoDVkK3oGG6MxjcwETJXID2fQZ6cqtjfWRDBo4etPEIZylNpVGsMuxFHXmqJqBITnhLnm/gxDElObznBbrdchRN/K4VkoldLQZxD6HCG33kHDY41Evv9aFCtTIg1gGAF45S7klhs8V20tWYJF/3MW+k3Ifnozin3qGNwLAQZhokBP0xLyuDYstCwBB636JGjnxhyAcYOijvBG6GW9iGkQCsM7y0SYzVW1mAOGnciuzRK2agLeyBGVP8rNRi+Qp+sdFmzAHeGrJc2ZwmZqUYR1eSGkMTPzW2RfaSRJbYCrW2jLY3ONRB1aXVGKbhTW5YXQ/QfKhfn+i2W0RxuFthwQlR1LwFUp8HxpSSDLqj/WGo1a1QY4qpCRGCRZWVpPd6glvo1hlOeJzXMqZbHnWfa7zTNgLmjGzVDn98BBvbUNd0dOkktUCnTQi+qVq6ihh2zJaO+J07nbtqV+4Hb/kroNqc3tdmc8k/pn6tJkWVTUAzrdVQUuN+X1uxB1YwUh4pAQsRgGQWIkFHv2af7dceFCAXZqnmfsRQEGAJZJyVe1XrYpAAAAAElFTkSuQmCC',
    Icon : 'data:image/png;base64,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'
}

var vm = new VersionManager(Constant.Version)
vm.checkUpdate();

var defaultBookmarks = {
    'operator' : '148',
    //'Wikipedia-ja' : '128',
    //'Blog' : '3',
    //'Company' : '4',
    //'EJ Dict' : '5'
}
var broadBookmarks = [
    {
        'wtid' : 1,
        'class' : 'google',
        'wid' : '1'
    },
    {
        'wtid' : 2,
        'class' : 'twitter',
        'wid' : '1'
    },
    {
        'wtid' : 3,
        'class' : 'amazon',
        'wid' : '1'
    },
    {
        'wtid' : 4,
        'class' : 'yahoo',
        'wid' : '1'
    },
    {
        'wtid' : 5,
        'class' : 'youtube',
        'wid' : '1'
    }
]

var Wix = {
    view : (function(){
        var _loginElement = [],
            _notLoginElement = [],
            _optionElement = []
        return {
            addLoginView : function(params){
                _loginElement.push(params);
            },
            addNotLoginView : function(params){
                _notLoginElement.push(params);
            },
            addOptionView : function(params){
                _optionElement.push(params);
            },
            getLoginView : function(data){
                var i = 0, max = _loginElement.length, list = [];
                for (; i<max; i++){
                    list = list.concat(_loginElement[i](data));
                }
                return list;
            },
            getNotLoginView : function(data){
                var i = 0, max = _notLoginElement.length, list = [];
                for (; i<max; i++){
                    list = list.concat(_notLoginElement[i](data));
                }
                return list;
            },
            getOptionView : function(data){
                var i = 0, max = _optionElement.length, list = [];
                for (; i<max; i++){
                    list = list.concat(_optionElement[i](data));
                }
                return list;
            },
            create : function(loginState, data){
                var temp = document.implementation.createDocument('http://www.w3.org/1999/xhtml', 'div', null),
                    body = Extension.UI.createElement('span', {
                            'id': 'wix-body'
                        }),
                    logo = Extension.UI.createElement('a', {
                            'id': 'wix-logo',
                            'href': 'javascript:void(0)'
                        }).append(Extension.UI.createElement('img', {
                            'id': 'wix-logo-img',
                            'src': Constant.Logo
                        })),
                    ajaxLoader = Extension.UI.createElement('span',{
                            'id': 'loading',
                        }),
                    optionButton = Extension.UI.createElement('button', {
                            'id': 'wix-option-button',
                            'onclick': "(function(){document.getElementById('wix-option-popup-dummy').style.display = 'block'})()"
                        }),
                    optionPopup = Extension.UI.createPopup('wix-option', Wix.view.getOptionView()),
                    content = Extension.UI.createElement('span', {
                            'id' : 'wix-content'
                        })

                if(Wix.option.get('Main', 'toolbar')){
                    body.setAttr({'class': 'close'});
                }

                content.appendChilds(Wix.view.getLoginView())

                temp.getElementsByTagName('div')[0]
                    .setAttr({'id':'temp'})
                    .append(logo)
                    .append(body.appendChilds([
                        content.append(ajaxLoader),
                        optionButton,
                        optionPopup
                    ]))
                Wix.view.doc = temp;
                return Wix.view.toHTML();
            },
            doc : null, //documentオブジェクト
            toHTML : function(){
                return Wix.view.doc.getElementById('temp').innerHTML
            },
            replace : function(id, newView, fn){
                var doc = Wix.view.doc,
                    node = doc.getElementById(id)
                if(fn){
                    fn();
                }
                doc.getElementById(id).parentNode.replaceChild(newView, node);
                return doc.getElementById(id).innerHTML
            }
        }
    }()),
    status : {
        id : '',
    },
    option : {
        values : {},
        get : function(objName, key){
            if(key){
                return this.values[objName][key];
            }else{
                return this.values[objName];
            }
        },
        set : function(objName, params){
            for (var key in params){
                if(params.hasOwnProperty(key)){
                    this.values[objName][key] = params[key];
                    Extension.Storage.localStorage.set(objName, this.values[objName]);
                }
            }
            Wix.view.replace(
                'wix-option-popup-dummy',
                Extension.UI.createPopup('wix-option', Wix.view.getOptionView())
            )
            return 'success';
        },
        init : function(params){
            Extension.Storage.localStorage.init(params);
            for (var key in params){
                this.values[key] = Extension.Storage.localStorage.get(key);
            }
        }
    },
}

Wix.main = new WIXClass({
    name : 'Main',
    type : 'core',
    option : {
        loginOmission : false,//初期値
        minLength : 3,//初期値
        id : '',
        toolbar : false
    },
    function : {
        'Initialize' : function(req, con){
            var uid = Wix.option.get('Main', 'id');

            if (!uid){
                generateKey(function(key){
                    Wix.option.set('Main' , {'id' : key});

                    if (Wix.view.doc == null){
                        Extension.Message.send(req, con, {data : Wix.view.create(), id : key});
                    } else {
                        Extension.Message.send(req, con, {data : Wix.view.toHTML(), id : key});
                    }
                })
            } else {
                if (Wix.view.doc == null){
                    Extension.Message.send(req, con, {data : Wix.view.create(), id : uid});
                } else {
                    Extension.Message.send(req, con, {data : Wix.view.toHTML(), id : uid});
                }
            }
        },
        'changeOption' : function(params){
            if (params.minLength){
                Wix.view.replace('wix-min-length', Extension.UI.createSlider(
                    'wix-min-length',
                    1,
                    5,
                    1,
                    params.minLength
                ))
            } else if (params.hasOwnProperty('toolbar')){
                $('#wix-body', Wix.view.doc).toggleClass('close');
            }
        },
        'VersionCheck' : function(req, con){
            Extension.Message.send(req, con, vm.isNewVersion());
        },
        'Attach' : function(req, con){
            var val = req.message;

            $.ajax({
                async: true,
                url: val.attachType == 'object' ? Constant.URL.ObjectAttach : Constant.URL.Attach,
                type: 'POST',
                data: "minLength=" + val.minLength
                    + "&uid=" + Wix.option.get('Main', 'id')
                    + "&bookmarkedWIX=" + val.bookmarkedWIX
                    + "&rewriteAnchorText=" + val.rewriteAnchorText
                    + "&body=" + val.body,
                success : function(res){
                    Extension.Message.send(req, con, res);
                },
                error : function(res){
                    Extension.Message.send(req, con, 'error');
                }
            })
        }
    },
    view : {
        login : function(){
            var attachButton,
                array = [];

            for (var key in defaultBookmarks) {
                if(defaultBookmarks.hasOwnProperty(key)){
                    attachButton = Extension.UI.createElement("button", {
                            'class': 'wix-attach',
                            'wid': defaultBookmarks[key]
                        }, key);
                    array.push(attachButton);
                }
            }

            attachOffButoon = Extension.UI.createElement("button",{
                'class' : 'wix-attach-off'
            });
            array.push(attachOffButoon);

            //minLength
            var minLength = Extension.UI.createSlider(
                    'wix-min-length',
                    1,
                    5,
                    1,
                    Wix.option.get('Main', 'minLength')
                )
            array.push(minLength)

            for (var i = 0; i < broadBookmarks.length; i++){
                attachButton = Extension.UI.createElement("button", {
                    'class': 'wix-broad-attach' + ' ' + broadBookmarks[i].class,
                    'wtid' : broadBookmarks[i].wtid,
                    'wid' : broadBookmarks[i].wid
                });

                array.push(attachButton);
            }

            return array
        },
        option : function(){
            var versionDiv = Extension.UI.createElement('div', {
                    'id': 'wix-version-container',
                    'class': 'wix-option-popup-title'
                }),
                wixLogoA = Extension.UI.createElement('a',{
                    'href': Constant.URL.HP
                }),
                wixLogoImg = Extension.UI.createElement('img',{
                    'src' : Constant.Logo,
                    'id' : 'wix-option-logo'
                }),
                wixVersion = Extension.UI.createElement('div', {
                    'id': 'wix-version'
                }, 'Version ' + Constant.Version),
                versionStatus = Extension.UI.createElement('div', {
                    'id': 'wix-version-status'
                }),
                copyRight = Extension.UI.createElement('div', {
                    'id': 'wix-copy-right',
                    'class': 'wix-option-popup-title'
                }),
                wix = Extension.UI.createElement('a', {
                    'href': Constant.URL.HP
                }, 'Web IndeX'),
                copyRightLab = Extension.UI.createElement('div', {
                    'id': 'wix-copy-right-lab'
                }, 'Copyright 2013 <a href="' + Constant.URL.LAB + '">Toyama Lab</a>, Keio Univ. All rights reserved.')

            versionDiv
                .append(wixLogoA.append(wixLogoImg))
                .append(wixVersion)
                .append(versionStatus)

            copyRight
                .append(wix)
                .append(copyRightLab)

            return [
                versionDiv,
                copyRight
            ]
        }
    }
});

function generateKey(fn){
   $.ajax({
        async : true,
        url : Constant.URL.Keygen,
        type : 'POST',
        success : function(key){
            fn(JSON.parse(key).id);
        },
        error : function(){

        }
    });
}

if(Extension.Status.browser == 'Chrome'){
    chrome.tabs.onSelectionChanged.addListener(
        function(tabId, selectInfo){
            chrome.tabs.sendRequest(tabId, {data: Wix.view.toHTML()});
        }
    );
}else if(Extension.Status.browser == 'Safari'){
    safari.application.addEventListener(
        "activate",
        function(e){
            if(e.target instanceof SafariBrowserTab){
                e.target.page.dispatchMessage('SyncView',{data: Wix.view.toHTML()});
            }
        },
        true
    );
}else if(Extension.Status.browser == 'Firefox'){
    gBrowser.addEventListener("select", function(event){
        event.target.contentWindow.postMessage({name:'SyncView', data: Wix.view.toHTML()}, '*');
    }, false);
}
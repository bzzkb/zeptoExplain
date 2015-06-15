/* Zepto v1.0rc1 - polyfill zepto event detect fx ajax form touch - zeptojs.com/license */ ;

//兼容性处理
(function (undefined) {
    //添加trim 正则去除字符串两边空格的方法
    if (String.prototype.trim === undefined) // fix for iOS 3.2
        String.prototype.trim = function () {
        return this.replace(/^\s+/, '').replace(/\s+$/, '')
    }

    // For iOS 3.x
    // from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/reduce
    if (Array.prototype.reduce === undefined)
        Array.prototype.reduce = function (fun) {
            if (this === void 0 || this === null) throw new TypeError()
            var t = Object(this),
                len = t.length >>> 0,
                k = 0,
                accumulator
            if (typeof fun != 'function') throw new TypeError()
            if (len == 0 && arguments.length == 1) throw new TypeError()

            if (arguments.length >= 2)
                accumulator = arguments[1]
            else
                do {
                    if (k in t) {
                        accumulator = t[k++]
                        break
                    }
                    if (++k >= len) throw new TypeError()
                } while (true)

            while (k < len) {
                if (k in t) accumulator = fun.call(undefined, accumulator, t[k], k, t)
                k++
            }
            return accumulator
        }

})()

//定义Zepto的方法和属性
var Zepto = (function () {
    var undefined, key, $, classList, emptyArray = [],
        slice = emptyArray.slice,
        document = window.document,
        elementDisplay = {},
        classCache = {},
        getComputedStyle = document.defaultView.getComputedStyle,
        cssNumber = {
            'column-count': 1,
            'columns': 1,
            'font-weight': 1,
            'line-height': 1,
            'opacity': 1,
            'z-index': 1,
            'zoom': 1
        },
        //HTML片段正则匹配
        fragmentRE = /^\s*<(\w+|!)[^>]*>/,

        // Used by `$.zepto.init` to wrap elements, text/comment nodes, document,
        // and document fragment node types.
        elementTypes = [1, 3, 8, 9, 11],

        adjacencyOperators = ['after', 'prepend', 'before', 'append'],
        table = document.createElement('table'),
        tableRow = document.createElement('tr'),
        containers = {
            'tr': document.createElement('tbody'),
            'tbody': table,
            'thead': table,
            'tfoot': table,
            'td': tableRow,
            'th': tableRow,
            '*': document.createElement('div')
        },
        readyRE = /complete|loaded|interactive/,
        classSelectorRE = /^\.([\w-]+)$/,
        idSelectorRE = /^#([\w-]+)$/,
        tagSelectorRE = /^[\w-]+$/,
        toString = ({}).toString,
        zepto = {},
        camelize, uniq,
        tempParent = document.createElement('div')


    //元素是否匹配CSS选择器实现
    zepto.matches = function (element, selector) {
        //nodeType为1代表Element类型的节点
        if (!element || element.nodeType !== 1) return false
            //优先使用各个浏览器的方法：matchesSelector用来匹配dom元素是否匹配某css selector。传入CSS选择器，返回true或者false
        var matchesSelector = element.webkitMatchesSelector || element.mozMatchesSelector ||
            element.oMatchesSelector || element.matchesSelector
            //设置作用域为元素，call方法传入的参数必须一个个列举，apply是传入数组
        if (matchesSelector) return matchesSelector.call(element, selector)
            // fall back to performing a selector:
            //如果浏览器不支持MatchesSelector方法，则将节点放入一个临时div节点，
            //再通过selector来查找这个div下的节点集，再判断给定的element是否在节点集中，如果在，则返回一个非零(即非false)的数字
        var match, parent = element.parentNode,
            temp = !parent
            //如果元素的父元素不存在，给元素添加子元素，子元素的内容是本身（就是把目标节点放在临时节点集中）
        if (temp)(parent = tempParent).appendChild(element)
            //获取索引，不存在是-1，通过~取反-1，得到0
        match = ~zepto.qsa(parent, selector).indexOf(element)
            //如果temp为真（元素的父元素不存在），那么js判断后面的表达式，为真，执行，移除节点
            //好厉害！！
        temp && tempParent.removeChild(element)
        return match
    }

    //这里等价于Object.prototype.toString.call()
    function isFunction(value) {
        return toString.call(value) == "[object Function]"
    }

    function isObject(value) {
        return value instanceof Object
    }

    function isPlainObject(value) {
        var key, ctor
        if (toString.call(value) !== "[object Object]") return false
        ctor = (isFunction(value.constructor) && value.constructor.prototype)
        if (!ctor || !hasOwnProperty.call(ctor, 'isPrototypeOf')) return false
        for (key in value);
        return key === undefined || hasOwnProperty.call(value, key)
    }

    function isArray(value) {
        return value instanceof Array
    }

    function likeArray(obj) {
        return typeof obj.length == 'number'
    }

    //数组迭代方法array.filter，对数组中的每一项运行给定函数，返回该函数会返回true的项的数组
    function compact(array) {
        return array.filter(function (item) {
            return item !== undefined && item !== null
        })
    }

    function flatten(array) {
        return array.length > 0 ? [].concat.apply([], array) : array
    }
    camelize = function (str) {
        return str.replace(/-+(.)?/g, function (match, chr) {
            return chr ? chr.toUpperCase() : ''
        })
    }

    function dasherize(str) {
        return str.replace(/::/g, '/')
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
            .replace(/([a-z\d])([A-Z])/g, '$1_$2')
            .replace(/_/g, '-')
            .toLowerCase()
    }

    uniq = function (array) {
        return array.filter(function (item, idx) {
            return array.indexOf(item) == idx
        })
    }

    function classRE(name) {
        return name in classCache ?
            classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
    }

    function maybeAddPx(name, value) {
        return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
    }

    function defaultDisplay(nodeName) {
        var element, display
        if (!elementDisplay[nodeName]) {
            element = document.createElement(nodeName)
            document.body.appendChild(element)
            display = getComputedStyle(element, '').getPropertyValue("display")
            element.parentNode.removeChild(element)
            display == "none" && (display = "block")
            elementDisplay[nodeName] = display
        }
        return elementDisplay[nodeName]
    }

    // `$.zepto.fragment` takes a html string and an optional tag name
    // to generate DOM nodes nodes from the given html string.
    // The generated DOM nodes are returned as an array.
    // This function can be overriden in plugins for example to make
    // it compatible with browsers that don't support the DOM fully.
    zepto.fragment = function (html, name) {
        if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
        if (!(name in containers)) name = '*'
        var container = containers[name]
        container.innerHTML = '' + html
        return $.each(slice.call(container.childNodes), function () {
            container.removeChild(this)
        })
    }

    // `$.zepto.Z` swaps out the prototype of the given `dom` array
    // of nodes with `$.fn` and thus supplying all the Zepto functions
    // to the array. Note that `__proto__` is not supported on Internet
    // Explorer. This method can be overriden in plugins.
    zepto.Z = function (dom, selector) {
        dom = dom || []
        dom.__proto__ = arguments.callee.prototype
        //通过设置使得dom继承所有Zepto方法
        dom.selector = selector || ''
        return dom
    }

    // `$.zepto.isZ` should return `true` if the given object is a Zepto
    // collection. This method can be overriden in plugins.
    //这里不清楚。Z不是一个函数吗
    zepto.isZ = function (object) {
        return object instanceof zepto.Z
    }

    // `$.zepto.init` is Zepto's counterpart [副本] to jQuery's `$.fn.init` and
    // takes a CSS selector and an optional context (and handles various
    // special cases).
    // This method can be overriden in plugins.
    zepto.init = function (selector, context) {
        // If nothing given, return an empty Zepto collection
        if (!selector) return zepto.Z()
            // If a function is given, call it when the DOM is ready
        else if (isFunction(selector)) return $(document).ready(selector)
            // If a Zepto collection is given, juts return it
        else if (zepto.isZ(selector)) return selector
        else {
            var dom
                // normalize array if an array of nodes is given
            if (isArray(selector)) dom = compact(selector)
                // if a JavaScript object is given, return a copy of it
                // this is a somewhat peculiar option, but supported by
                // jQuery so we'll do it, too
            else if (isPlainObject(selector))
                dom = [$.extend({}, selector)], selector = null
                // wrap stuff like `document` or `window`
            else if (elementTypes.indexOf(selector.nodeType) >= 0 || selector === window)
                dom = [selector], selector = null
                // If it's a html fragment, create nodes from it
            else if (fragmentRE.test(selector))
                dom = zepto.fragment(selector.trim(), RegExp.$1), selector = null
                // If there's a context, create a collection on that context first, and select
                // nodes from there
            else if (context !== undefined) return $(context).find(selector)
                // And last but no least, if it's a CSS selector, use it to select nodes.
            else dom = zepto.qsa(document, selector)
                // create a new Zepto collection from the nodes found
            return zepto.Z(dom, selector)
        }
    }

    // `$` will be the base `Zepto` object. When calling this
    // function just call `$.zepto.init, whichs makes the implementation [实现]
    // details of selecting nodes and creating Zepto collections
    // patchable in plugins.
    $ = function (selector, context) {
        return zepto.init(selector, context)
    }

    // Copy all but undefined properties from one or more
    // objects to the `target` object.
    //调用方法：$.extend(target,{});
    //第二个参数是个对象（怪不得=。=刚开始一直不理解为什么要转换数组并从1开始）
    $.extend = function (target) {
        //Array.prototype.slice.call(arguments)能将具有length属性的对象转成数组；
        //如果传入了参数：返回一个新的数组，包含从 start 到 end （不包括该元素）（end可以省略）的 arrayObject 中的元素。
        slice.call(arguments, 1).forEach(function (source) {
            for (key in source)
                if (source[key] !== undefined)
                    target[key] = source[key]
            //对目标元素进行复制
        })
        return target
    }

    // `$.zepto.qsa` is Zepto's CSS selector implementation which
    // uses `document.querySelectorAll` and optimizes for some special cases, like `#id`.
    // This method can be overriden in plugins.
    //querySelectorAll方法
    zepto.qsa = function (element, selector) {
        var found
        //===三个等号不进行类型转换进行强比较
        //判断是否是document节点并且是id选择器 -> 原生id选择
        //不是的话就是类或者标签或者CSS选择器
        //好强的条件判断
        return (element === document && idSelectorRE.test(selector)) ?
            ((found = element.getElementById(RegExp.$1)) ? [found] : emptyArray) :
            (element.nodeType !== 1 && element.nodeType !== 9) ? emptyArray :
            slice.call(
                //判断是否是类选择器，是就进行类选择，否则判断是否是标签选择器~不是的话就进行qsa。
                classSelectorRE.test(selector) ? element.getElementsByClassName(RegExp.$1) :
                tagSelectorRE.test(selector) ? element.getElementsByTagName(selector) :
                element.querySelectorAll(selector)
            )
    }

    //结果集进行过滤，不传入选择器就进行初始化
    function filtered(nodes, selector) {
        return selector === undefined ? $(nodes) : $(nodes).filter(selector)
    }

    //非常重要非常重要！
    //处理arg为函数或者值的情况
    //传入的参数是函数的时候调用函数，不过还不清楚idx和payload是干嘛的（参数）
    function funcArg(context, arg, idx, payload) {
        return isFunction(arg) ? arg.call(context, idx, payload) : arg
    }

    //虽然后面的函数名是有参数的，但是这样赋值的时候不需要传入参数。后面调用的时候再传入参数
    $.isFunction = isFunction
    $.isObject = isObject
    $.isArray = isArray
    $.isPlainObject = isPlainObject

    //获得元素在数组中的位置（参数中如果含有index则返回true或者false
    $.inArray = function (elem, array, i) {
        return emptyArray.indexOf.call(array, elem, i)
    }

    //trim()函数移除字符串两侧的空白字符或其他预定义字符。
    //JavaScript中没有实现，使用正则表达式：return this.replace(/^\s+/, '').replace(/\s+$/, '')
    $.trim = function (str) {
        return str.trim()
    }

    // plugin compatibility
    $.uuid = 0

    //把elements的数组进行遍历并放入处理函数，返回的结果存放在values中，去掉了null以及undefine，并返回
    $.map = function (elements, callback) {
        var value, values = [],
            i, key
        if (likeArray(elements))
            for (i = 0; i < elements.length; i++) {
                value = callback(elements[i], i)
                if (value != null) values.push(value)
            }
        else
            //这里没有统一的用for in,是为了避免遍历数据默认属性的情况，如数组的toString,valueOf（这些属性是不可以遍历的）
            for (key in elements) {
                value = callback(elements[key], key)
                if (value != null) values.push(value)
            }
        return flatten(values)
    }

    //Zepto元素迭代方法，如果数据处理后返回false则返回这个元素
    //for in穷举：通过属性来判断
    //propertyIsEnumerable返回 Boolean 值，指出所指定的属性是否为一个对象的一部分以及该属性是否是可列举的。如果 proName 存在于 object 中且可以使用一个 For…In
    //循环穷举出来，那么propertyIsEnumerable 属性返回 true
    $.each = function (elements, callback) {
        var i, key
        if (likeArray(elements)) {
            for (i = 0; i < elements.length; i++)
                if (callback.call(elements[i], i, elements[i]) === false) return elements
        } else {
            //elements是对象
            for (key in elements)
                if (callback.call(elements[key], key, elements[key]) === false) return elements
        }

        return elements
    }

    // Define methods that will be available on all
    // Zepto collections
    // 所有Zepto对象都可以使用的方法
    $.fn = {
        // Because a collection acts like an array
        // copy over these useful array functions.
        forEach: emptyArray.forEach,
        reduce: emptyArray.reduce,
        push: emptyArray.push,
        indexOf: emptyArray.indexOf,
        concat: emptyArray.concat,

        // `map` and `slice` in the jQuery API work differently
        // from their array counterparts
        map: function (fn) {
                return $.map(this, function (el, i) {
                    return fn.call(el, i, el)
                })
            },
            slice: function () {
                return $(slice.apply(this, arguments))
            },

            ready: function (callback) {
                if (readyRE.test(document.readyState)) callback($)
                else document.addEventListener('DOMContentLoaded', function () {
                    callback($)
                }, false)
                return this
            },
            get: function (idx) {
                return idx === undefined ? slice.call(this) : this[idx]
            },
            toArray: function () {
                return this.get()
            },
            size: function () {
                return this.length
            },
            remove: function () {
                return this.each(function () {
                    if (this.parentNode != null)
                        this.parentNode.removeChild(this)
                })
            },
            each: function (callback) {
                this.forEach(function (el, idx) {
                    callback.call(el, idx, el)
                })
                return this
            },
            filter: function (selector) {
                return $([].filter.call(this, function (element) {
                    return zepto.matches(element, selector)
                }))
            },
            add: function (selector, context) {
                return $(uniq(this.concat($(selector, context))))
            },
            is: function (selector) {
                return this.length > 0 && zepto.matches(this[0], selector)
            },
            not: function (selector) {
                var nodes = []
                if (isFunction(selector) && selector.call !== undefined)
                    this.each(function (idx) {
                        if (!selector.call(this, idx)) nodes.push(this)
                    })
                else {
                    var excludes = typeof selector == 'string' ? this.filter(selector) :
                        (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
                    this.forEach(function (el) {
                        if (excludes.indexOf(el) < 0) nodes.push(el)
                    })
                }
                return $(nodes)
            },
            eq: function (idx) {
                return idx === -1 ? this.slice(idx) : this.slice(idx, +idx + 1)
            },
            first: function () {
                var el = this[0]
                return el && !isObject(el) ? el : $(el)
            },
            last: function () {
                var el = this[this.length - 1]
                return el && !isObject(el) ? el : $(el)
            },
            find: function (selector) {
                var result
                if (this.length == 1) result = zepto.qsa(this[0], selector)
                else result = this.map(function () {
                    return zepto.qsa(this, selector)
                })
                return $(result)
            },
            closest: function (selector, context) {
                var node = this[0]
                while (node && !zepto.matches(node, selector))
                    node = node !== context && node !== document && node.parentNode
                return $(node)
            },
            parents: function (selector) {
                var ancestors = [],
                    nodes = this
                while (nodes.length > 0)
                    nodes = $.map(nodes, function (node) {
                        if ((node = node.parentNode) && node !== document && ancestors.indexOf(node) < 0) {
                            ancestors.push(node)
                            return node
                        }
                    })
                return filtered(ancestors, selector)
            },
            parent: function (selector) {
                return filtered(uniq(this.pluck('parentNode')), selector)
            },
            children: function (selector) {
                return filtered(this.map(function () {
                    return slice.call(this.children)
                }), selector)
            },
            siblings: function (selector) {
                return filtered(this.map(function (i, el) {
                    return slice.call(el.parentNode.children).filter(function (child) {
                        return child !== el
                    })
                }), selector)
            },
            empty: function () {
                return this.each(function () {
                    this.innerHTML = ''
                })
            },
            // `pluck` is borrowed from Prototype.js
            pluck: function (property) {
                return this.map(function () {
                    return this[property]
                })
            },
            show: function () {
                return this.each(function () {
                    this.style.display == "none" && (this.style.display = null)
                    if (getComputedStyle(this, '').getPropertyValue("display") == "none")
                        this.style.display = defaultDisplay(this.nodeName)
                })
            },
            replaceWith: function (newContent) {
                return this.before(newContent).remove()
            },
            wrap: function (newContent) {
                return this.each(function () {
                    $(this).wrapAll($(newContent)[0].cloneNode(false))
                })
            },
            wrapAll: function (newContent) {
                if (this[0]) {
                    $(this[0]).before(newContent = $(newContent))
                    newContent.append(this)
                }
                return this
            },
            unwrap: function () {
                this.parent().each(function () {
                    $(this).replaceWith($(this).children())
                })
                return this
            },
            clone: function () {
                return $(this.map(function () {
                    return this.cloneNode(true)
                }))
            },
            hide: function () {
                return this.css("display", "none")
            },
            toggle: function (setting) {
                return (setting === undefined ? this.css("display") == "none" : setting) ? this.show() : this.hide()
            },
            prev: function () {
                return $(this.pluck('previousElementSibling'))
            },
            next: function () {
                return $(this.pluck('nextElementSibling'))
            },
            html: function (html) {
                return html === undefined ?
                    (this.length > 0 ? this[0].innerHTML : null) :
                    this.each(function (idx) {
                        var originHtml = this.innerHTML
                        $(this).empty().append(funcArg(this, html, idx, originHtml))
                    })
            },
            text: function (text) {
                return text === undefined ?
                    (this.length > 0 ? this[0].textContent : null) :
                    this.each(function () {
                        this.textContent = text
                    })
            },
            attr: function (name, value) {
                var result
                return (typeof name == 'string' && value === undefined) ?
                    (this.length == 0 || this[0].nodeType !== 1 ? undefined :
                        (name == 'value' && this[0].nodeName == 'INPUT') ? this.val() :
                        (!(result = this[0].getAttribute(name)) && name in this[0]) ? this[0][name] : result
                    ) :
                    this.each(function (idx) {
                        if (this.nodeType !== 1) return
                        if (isObject(name))
                            for (key in name) this.setAttribute(key, name[key])
                        else this.setAttribute(name, funcArg(this, value, idx, this.getAttribute(name)))
                    })
            },
            removeAttr: function (name) {
                return this.each(function () {
                    if (this.nodeType === 1) this.removeAttribute(name)
                })
            },
            prop: function (name, value) {
                return (value === undefined) ?
                    (this[0] ? this[0][name] : undefined) :
                    this.each(function (idx) {
                        this[name] = funcArg(this, value, idx, this[name])
                    })
            },
            data: function (name, value) {
                var data = this.attr('data-' + dasherize(name), value)
                return data !== null ? data : undefined
            },
            val: function (value) {
                return (value === undefined) ?
                    (this.length > 0 ? this[0].value : undefined) :
                    this.each(function (idx) {
                        this.value = funcArg(this, value, idx, this.value)
                    })
            },
            offset: function () {
                if (this.length == 0) return null
                var obj = this[0].getBoundingClientRect()
                return {
                    left: obj.left + window.pageXOffset,
                    top: obj.top + window.pageYOffset,
                    width: obj.width,
                    height: obj.height
                }
            },
            css: function (property, value) {
                if (value === undefined && typeof property == 'string')
                    return (
                        this.length == 0 ? undefined : this[0].style[camelize(property)] || getComputedStyle(this[0], '').getPropertyValue(property))

                var css = ''
                for (key in property)
                    if (typeof property[key] == 'string' && property[key] == '')
                        this.each(function () {
                            this.style.removeProperty(dasherize(key))
                        })
                    else
                        css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'

                if (typeof property == 'string')
                    if (value == '')
                        this.each(function () {
                            this.style.removeProperty(dasherize(property))
                        })
                    else
                        css = dasherize(property) + ":" + maybeAddPx(property, value)

                return this.each(function () {
                    this.style.cssText += ';' + css
                })
            },
            index: function (element) {
                return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
            },
            hasClass: function (name) {
                if (this.length < 1) return false
                else return classRE(name).test(this[0].className)
            },
            addClass: function (name) {
                return this.each(function (idx) {
                    classList = []
                    var cls = this.className,
                        newName = funcArg(this, name, idx, cls)
                    newName.split(/\s+/g).forEach(function (klass) {
                        if (!$(this).hasClass(klass)) classList.push(klass)
                    }, this)
                    classList.length && (this.className += (cls ? " " : "") + classList.join(" "))
                })
            },
            removeClass: function (name) {
                return this.each(function (idx) {
                    if (name === undefined)
                        return this.className = ''
                    classList = this.className
                    funcArg(this, name, idx, classList).split(/\s+/g).forEach(function (klass) {
                        classList = classList.replace(classRE(klass), " ")
                    })
                    this.className = classList.trim()
                })
            },
            toggleClass: function (name, when) {
                return this.each(function (idx) {
                    var newName = funcArg(this, name, idx, this.className);
                    (when === undefined ? !$(this).hasClass(newName) : when) ?
                    $(this).addClass(newName): $(this).removeClass(newName)
                })
            }
    }

    // Generate the `width` and `height` functions
    ;
    ['width', 'height'].forEach(function (dimension) {
        $.fn[dimension] = function (value) {
            var offset, Dimension = dimension.replace(/./, function (m) {
                return m[0].toUpperCase()
            })
            if (value === undefined) return this[0] == window ? window['inner' + Dimension] :
                this[0] == document ? document.documentElement['offset' + Dimension] :
                (offset = this.offset()) && offset[dimension]
            else return this.each(function (idx) {
                var el = $(this)
                el.css(dimension, funcArg(this, value, idx, el[dimension]()))
            })
        }
    })

    function insert(operator, target, node) {
        var parent = (operator % 2) ? target : target.parentNode
        parent ? parent.insertBefore(node, !operator ? target.nextSibling : // after
                operator == 1 ? parent.firstChild : // prepend
                operator == 2 ? target : // before
                null) : // append
            $(node).remove()
    }

    function traverseNode(node, fun) {
        fun(node)
        for (var key in node.childNodes) traverseNode(node.childNodes[key], fun)
    }

    // Generate the `after`, `prepend`, `before`, `append`,
    // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
    adjacencyOperators.forEach(function (key, operator) {
        $.fn[key] = function () {
            // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
            var nodes = $.map(arguments, function (n) {
                return isObject(n) ? n : zepto.fragment(n)
            })
            if (nodes.length < 1) return this
            var size = this.length,
                copyByClone = size > 1,
                inReverse = operator < 2

            return this.each(function (index, target) {
                for (var i = 0; i < nodes.length; i++) {
                    var node = nodes[inReverse ? nodes.length - i - 1 : i]
                    traverseNode(node, function (node) {
                        if (node.nodeName != null && node.nodeName.toUpperCase() === 'SCRIPT' && (!node.type || node.type === 'text/javascript'))
                            window['eval'].call(window, node.innerHTML)
                    })
                    if (copyByClone && index < size - 1) node = node.cloneNode(true)
                    insert(operator, target, node)
                }
            })
        }

        $.fn[(operator % 2) ? key + 'To' : 'insert' + (operator ? 'Before' : 'After')] = function (html) {
            $(html)[key](this)
            return this
        }
    })

    zepto.Z.prototype = $.fn

    // Export internal API functions in the `$.zepto` namespace
    zepto.camelize = camelize
    zepto.uniq = uniq
    $.zepto = zepto

    return $
})()

// If `$` is not yet defined, point it to `Zepto`
window.Zepto = Zepto
//js格式化后会自动去掉行，导致js编译错误
'$' in window || (window.$ = Zepto);

//一般事件处理
(function ($) {
    var $$ = $.zepto.qsa,
        handlers = {},
        _zid = 1,
        specialEvents = {}

    specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

    function zid(element) {
        return element._zid || (element._zid = _zid++)
    }

    function findHandlers(element, event, fn, selector) {
        event = parse(event)
        if (event.ns) var matcher = matcherFor(event.ns)
        return (handlers[zid(element)] || []).filter(function (handler) {
            return handler && (!event.e || handler.e == event.e) && (!event.ns || matcher.test(handler.ns)) && (!fn || zid(handler.fn) === zid(fn)) && (!selector || handler.sel == selector)
        })
    }

    function parse(event) {
        var parts = ('' + event).split('.')
        return {
            e: parts[0],
            ns: parts.slice(1).sort().join(' ')
        }
    }

    function matcherFor(ns) {
        return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
    }

    function eachEvent(events, fn, iterator) {
        if ($.isObject(events)) $.each(events, iterator)
        else events.split(/\s/).forEach(function (type) {
            iterator(type, fn)
        })
    }

    function add(element, events, fn, selector, getDelegate, capture) {
        capture = !!capture
        var id = zid(element),
            set = (handlers[id] || (handlers[id] = []))
        eachEvent(events, fn, function (event, fn) {
            var delegate = getDelegate && getDelegate(fn, event),
                callback = delegate || fn
            var proxyfn = function (event) {
                var result = callback.apply(element, [event].concat(event.data))
                if (result === false) event.preventDefault()
                return result
            }
            var handler = $.extend(parse(event), {
                fn: fn,
                proxy: proxyfn,
                sel: selector,
                del: delegate,
                i: set.length
            })
            set.push(handler)
            element.addEventListener(handler.e, proxyfn, capture)
        })
    }

    function remove(element, events, fn, selector) {
        var id = zid(element)
        eachEvent(events || '', fn, function (event, fn) {
            findHandlers(element, event, fn, selector).forEach(function (handler) {
                delete handlers[id][handler.i]
                element.removeEventListener(handler.e, handler.proxy, false)
            })
        })
    }

    $.event = {
        add: add,
        remove: remove
    }

    $.proxy = function (fn, context) {
        if ($.isFunction(fn)) {
            var proxyFn = function () {
                return fn.apply(context, arguments)
            }
            proxyFn._zid = zid(fn)
            return proxyFn
        } else if (typeof context == 'string') {
            return $.proxy(fn[context], fn)
        } else {
            throw new TypeError("expected function")
        }
    }

    $.fn.bind = function (event, callback) {
        return this.each(function () {
            add(this, event, callback)
        })
    }
    $.fn.unbind = function (event, callback) {
        return this.each(function () {
            remove(this, event, callback)
        })
    }
    $.fn.one = function (event, callback) {
        return this.each(function (i, element) {
            add(this, event, callback, null, function (fn, type) {
                return function () {
                    var result = fn.apply(element, arguments)
                    remove(element, type, fn)
                    return result
                }
            })
        })
    }

    var returnTrue = function () {
            return true
        },
        returnFalse = function () {
            return false
        },
        eventMethods = {
            preventDefault: 'isDefaultPrevented',
            stopImmediatePropagation: 'isImmediatePropagationStopped',
            stopPropagation: 'isPropagationStopped'
        }

    function createProxy(event) {
        var proxy = $.extend({
            originalEvent: event
        }, event)
        $.each(eventMethods, function (name, predicate) {
            proxy[name] = function () {
                this[predicate] = returnTrue
                return event[name].apply(event, arguments)
            }
            proxy[predicate] = returnFalse
        })
        return proxy
    }

    // emulates the 'defaultPrevented' property for browsers that have none
    function fix(event) {
        if (!('defaultPrevented' in event)) {
            event.defaultPrevented = false
            var prevent = event.preventDefault
            event.preventDefault = function () {
                this.defaultPrevented = true
                prevent.call(this)
            }
        }
    }

    $.fn.delegate = function (selector, event, callback) {
        var capture = false
        if (event == 'blur' || event == 'focus') {
            if ($.iswebkit)
                event = event == 'blur' ? 'focusout' : event == 'focus' ? 'focusin' : event
            else
                capture = true
        }

        return this.each(function (i, element) {
            add(element, event, callback, selector, function (fn) {
                return function (e) {
                    var evt, match = $(e.target).closest(selector, element).get(0)
                    if (match) {
                        evt = $.extend(createProxy(e), {
                            currentTarget: match,
                            liveFired: element
                        })
                        return fn.apply(match, [evt].concat([].slice.call(arguments, 1)))
                    }
                }
            }, capture)
        })
    }
    $.fn.undelegate = function (selector, event, callback) {
        return this.each(function () {
            remove(this, event, callback, selector)
        })
    }

    $.fn.live = function (event, callback) {
        $(document.body).delegate(this.selector, event, callback)
        return this
    }
    $.fn.die = function (event, callback) {
        $(document.body).undelegate(this.selector, event, callback)
        return this
    }

    $.fn.on = function (event, selector, callback) {
        return selector == undefined || $.isFunction(selector) ?
            this.bind(event, selector) : this.delegate(selector, event, callback)
    }
    $.fn.off = function (event, selector, callback) {
        return selector == undefined || $.isFunction(selector) ?
            this.unbind(event, selector) : this.undelegate(selector, event, callback)
    }

    $.fn.trigger = function (event, data) {
        if (typeof event == 'string') event = $.Event(event)
        fix(event)
        event.data = data
        return this.each(function () {
            // items in the collection might not be DOM elements
            // (todo: possibly support events on plain old objects)
            if ('dispatchEvent' in this) this.dispatchEvent(event)
        })
    }

    // triggers event handlers on current element just as if an event occurred,
    // doesn't trigger an actual event, doesn't bubble
    $.fn.triggerHandler = function (event, data) {
        var e, result
        this.each(function (i, element) {
            e = createProxy(typeof event == 'string' ? $.Event(event) : event)
            e.data = data
            e.target = element
            $.each(findHandlers(element, event.type || event), function (i, handler) {
                result = handler.proxy(e)
                if (e.isImmediatePropagationStopped()) return false
            })
        })
        return result
    }

    // shortcut methods for `.bind(event, fn)` for each event type
    ;
    ('focusin focusout load resize scroll unload click dblclick ' +
        'mousedown mouseup mousemove mouseover mouseout ' +
        'change select keydown keypress keyup error').split(' ').forEach(function (event) {
        $.fn[event] = function (callback) {
            return this.bind(event, callback)
        }
    })

    ;
    ['focus', 'blur'].forEach(function (name) {
        $.fn[name] = function (callback) {
            if (callback) this.bind(name, callback)
            else if (this.length) try {
                this.get(0)[name]()
            } catch (e) {}
            return this
        }
    })

    $.Event = function (type, props) {
        var event = document.createEvent(specialEvents[type] || 'Events'),
            bubbles = true
        if (props)
            for (var name in props)(name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
        event.initEvent(type, bubbles, true, null, null, null, null, null, null, null, null, null, null, null, null)
        return event
    }
})(Zepto);

//浏览器检测
(function ($) {
    function detect(ua) {
        var os = this.os = {},
            browser = this.browser = {},
            webkit = ua.match(/WebKit\/([\d.]+)/),
            android = ua.match(/(Android)\s+([\d.]+)/),
            ipad = ua.match(/(iPad).*OS\s([\d_]+)/),
            iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/),
            webos = ua.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),
            touchpad = webos && ua.match(/TouchPad/),
            kindle = ua.match(/Kindle\/([\d.]+)/),
            silk = ua.match(/Silk\/([\d._]+)/),
            blackberry = ua.match(/(BlackBerry).*Version\/([\d.]+)/)

        // todo clean this up with a better OS/browser
        // separation. we need to discern between multiple
        // browsers on android, and decide if kindle fire in
        // silk mode is android or not

        if (browser.webkit = !!webkit) browser.version = webkit[1]

        if (android) os.android = true, os.version = android[2]
        if (iphone) os.ios = os.iphone = true, os.version = iphone[2].replace(/_/g, '.')
        if (ipad) os.ios = os.ipad = true, os.version = ipad[2].replace(/_/g, '.')
        if (webos) os.webos = true, os.version = webos[2]
        if (touchpad) os.touchpad = true
        if (blackberry) os.blackberry = true, os.version = blackberry[2]
        if (kindle) os.kindle = true, os.version = kindle[1]
        if (silk) browser.silk = true, browser.version = silk[1]
        if (!silk && os.android && ua.match(/Kindle Fire/)) browser.silk = true
    }

    detect.call($, navigator.userAgent)
        // make available to unit tests
    $.__detect = detect
})(Zepto);

//动画实现
(function ($, undefined) {
    var prefix = '',
        eventPrefix, endEventName, endAnimationName,
        vendors = {
            Webkit: 'webkit',
            Moz: '',
            O: 'o',
            ms: 'MS'
        },
        document = window.document,
        testEl = document.createElement('div'),
        supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
        clearProperties = {}

    function downcase(str) {
        return str.toLowerCase()
    }

    function normalizeEvent(name) {
        return eventPrefix ? eventPrefix + name : downcase(name)
    }

    $.each(vendors, function (vendor, event) {
        if (testEl.style[vendor + 'TransitionProperty'] !== undefined) {
            prefix = '-' + downcase(vendor) + '-'
            eventPrefix = event
            return false
        }
    })

    clearProperties[prefix + 'transition-property'] =
        clearProperties[prefix + 'transition-duration'] =
        clearProperties[prefix + 'transition-timing-function'] =
        clearProperties[prefix + 'animation-name'] =
        clearProperties[prefix + 'animation-duration'] = ''

    $.fx = {
        off: (eventPrefix === undefined && testEl.style.transitionProperty === undefined),
        cssPrefix: prefix,
        transitionEnd: normalizeEvent('TransitionEnd'),
        animationEnd: normalizeEvent('AnimationEnd')
    }

    $.fn.animate = function (properties, duration, ease, callback) {
        if ($.isObject(duration))
            ease = duration.easing, callback = duration.complete, duration = duration.duration
        if (duration) duration = duration / 1000
        return this.anim(properties, duration, ease, callback)
    }

    $.fn.anim = function (properties, duration, ease, callback) {
        var transforms, cssProperties = {},
            key, that = this,
            wrappedCallback, endEvent = $.fx.transitionEnd
        if (duration === undefined) duration = 0.4
        if ($.fx.off) duration = 0

        if (typeof properties == 'string') {
            // keyframe animation
            cssProperties[prefix + 'animation-name'] = properties
            cssProperties[prefix + 'animation-duration'] = duration + 's'
            endEvent = $.fx.animationEnd
        } else {
            // CSS transitions
            for (key in properties)
                if (supportedTransforms.test(key)) {
                    transforms || (transforms = [])
                    transforms.push(key + '(' + properties[key] + ')')
                } else cssProperties[key] = properties[key]

            if (transforms) cssProperties[prefix + 'transform'] = transforms.join(' ')
            if (!$.fx.off && typeof properties === 'object') {
                cssProperties[prefix + 'transition-property'] = Object.keys(properties).join(', ')
                cssProperties[prefix + 'transition-duration'] = duration + 's'
                cssProperties[prefix + 'transition-timing-function'] = (ease || 'linear')
            }
        }

        wrappedCallback = function (event) {
            if (typeof event !== 'undefined') {
                if (event.target !== event.currentTarget) return // makes sure the event didn't bubble from "below"
                $(event.target).unbind(endEvent, arguments.callee)
            }
            $(this).css(clearProperties)
            callback && callback.call(this)
        }
        if (duration > 0) this.bind(endEvent, wrappedCallback)

        setTimeout(function () {
            that.css(cssProperties)
            if (duration <= 0) setTimeout(function () {
                that.each(function () {
                    wrappedCallback.call(this)
                })
            }, 0)
        }, 0)

        return this
    }

    testEl = null
})(Zepto);

//Ajax实现
(function ($) {
    var jsonpID = 0,
        isObject = $.isObject,
        document = window.document,
        key,
        name,
        rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        scriptTypeRE = /^(?:text|application)\/javascript/i,
        xmlTypeRE = /^(?:text|application)\/xml/i,
        jsonType = 'application/json',
        htmlType = 'text/html',
        blankRE = /^\s*$/

    // trigger a custom event and return false if it was cancelled
    function triggerAndReturn(context, eventName, data) {
        var event = $.Event(eventName)
        $(context).trigger(event, data)
        return !event.defaultPrevented
    }

    // trigger an Ajax "global" event
    function triggerGlobal(settings, context, eventName, data) {
        if (settings.global) return triggerAndReturn(context || document, eventName, data)
    }

    // Number of active Ajax requests
    $.active = 0

    function ajaxStart(settings) {
        if (settings.global && $.active++ === 0) triggerGlobal(settings, null, 'ajaxStart')
    }

    function ajaxStop(settings) {
        if (settings.global && !(--$.active)) triggerGlobal(settings, null, 'ajaxStop')
    }

    // triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
    function ajaxBeforeSend(xhr, settings) {
        var context = settings.context
        if (settings.beforeSend.call(context, xhr, settings) === false ||
            triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false)
            return false

        triggerGlobal(settings, context, 'ajaxSend', [xhr, settings])
    }

    function ajaxSuccess(data, xhr, settings) {
            var context = settings.context,
                status = 'success'
            settings.success.call(context, data, status, xhr)
            triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data])
            ajaxComplete(status, xhr, settings)
        }
        // type: "timeout", "error", "abort", "parsererror"

    function ajaxError(error, type, xhr, settings) {
            var context = settings.context
            settings.error.call(context, xhr, type, error)
            triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error])
            ajaxComplete(type, xhr, settings)
        }
        // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"

    function ajaxComplete(status, xhr, settings) {
        var context = settings.context
        settings.complete.call(context, xhr, status)
        triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings])
        ajaxStop(settings)
    }

    // Empty function, used as default callback
    function empty() {}

    $.ajaxJSONP = function (options) {
        var callbackName = 'jsonp' + (++jsonpID),
            script = document.createElement('script'),
            abort = function () {
                $(script).remove()
                if (callbackName in window) window[callbackName] = empty
                ajaxComplete('abort', xhr, options)
            },
            xhr = {
                abort: abort
            },
            abortTimeout

        if (options.error) script.onerror = function () {
            xhr.abort()
            options.error()
        }

        window[callbackName] = function (data) {
            clearTimeout(abortTimeout)
            $(script).remove()
            delete window[callbackName]
            ajaxSuccess(data, xhr, options)
        }

        serializeData(options)
        script.src = options.url.replace(/=\?/, '=' + callbackName)
        $('head').append(script)

        if (options.timeout > 0) abortTimeout = setTimeout(function () {
            xhr.abort()
            ajaxComplete('timeout', xhr, options)
        }, options.timeout)

        return xhr
    }

    $.ajaxSettings = {
        // Default type of request
        type: 'GET',
        // Callback that is executed before request
        beforeSend: empty,
        // Callback that is executed if the request succeeds
        success: empty,
        // Callback that is executed the the server drops error
        error: empty,
        // Callback that is executed on request complete (both: error and success)
        complete: empty,
        // The context for the callbacks
        context: null,
        // Whether to trigger "global" Ajax events
        global: true,
        // Transport
        xhr: function () {
                return new window.XMLHttpRequest()
            },
            // MIME types mapping
            accepts: {
                script: 'text/javascript, application/javascript',
                json: jsonType,
                xml: 'application/xml, text/xml',
                html: htmlType,
                text: 'text/plain'
            },
            // Whether the request is to another domain
            crossDomain: false,
        // Default timeout
        timeout: 0
    }

    function mimeToDataType(mime) {
        return mime && (mime == htmlType ? 'html' :
            mime == jsonType ? 'json' :
            scriptTypeRE.test(mime) ? 'script' :
            xmlTypeRE.test(mime) && 'xml') || 'text'
    }

    function appendQuery(url, query) {
        return (url + '&' + query).replace(/[&?]{1,2}/, '?')
    }

    // serialize payload and append it to the URL for GET requests
    function serializeData(options) {
        if (isObject(options.data)) options.data = $.param(options.data)
        if (options.data && (!options.type || options.type.toUpperCase() == 'GET'))
            options.url = appendQuery(options.url, options.data)
    }

    $.ajax = function (options) {
        var settings = $.extend({}, options || {})
        for (key in $.ajaxSettings)
            if (settings[key] === undefined) settings[key] = $.ajaxSettings[key]

        ajaxStart(settings)

        if (!settings.crossDomain) settings.crossDomain = /^([\w-]+:)?\/\/([^\/]+)/.test(settings.url) &&
            RegExp.$2 != window.location.host

        var dataType = settings.dataType,
            hasPlaceholder = /=\?/.test(settings.url)
        if (dataType == 'jsonp' || hasPlaceholder) {
            if (!hasPlaceholder) settings.url = appendQuery(settings.url, 'callback=?')
            return $.ajaxJSONP(settings)
        }

        if (!settings.url) settings.url = window.location.toString()
        serializeData(settings)

        var mime = settings.accepts[dataType],
            baseHeaders = {},
            protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
            xhr = $.ajaxSettings.xhr(),
            abortTimeout

        if (!settings.crossDomain) baseHeaders['X-Requested-With'] = 'XMLHttpRequest'
        if (mime) {
            baseHeaders['Accept'] = mime
            if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0]
            xhr.overrideMimeType && xhr.overrideMimeType(mime)
        }
        if (settings.contentType || (settings.data && settings.type.toUpperCase() != 'GET'))
            baseHeaders['Content-Type'] = (settings.contentType || 'application/x-www-form-urlencoded')
        settings.headers = $.extend(baseHeaders, settings.headers || {})

        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                clearTimeout(abortTimeout)
                var result, error = false
                if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
                    dataType = dataType || mimeToDataType(xhr.getResponseHeader('content-type'))
                    result = xhr.responseText

                    try {
                        if (dataType == 'script')(1, eval)(result)
                        else if (dataType == 'xml') result = xhr.responseXML
                        else if (dataType == 'json') result = blankRE.test(result) ? null : JSON.parse(result)
                    } catch (e) {
                        error = e
                    }

                    if (error) ajaxError(error, 'parsererror', xhr, settings)
                    else ajaxSuccess(result, xhr, settings)
                } else {
                    ajaxError(null, 'error', xhr, settings)
                }
            }
        }

        var async = 'async' in settings ? settings.async : true
        xhr.open(settings.type, settings.url, async)

        for (name in settings.headers) xhr.setRequestHeader(name, settings.headers[name])

        if (ajaxBeforeSend(xhr, settings) === false) {
            xhr.abort()
            return false
        }

        if (settings.timeout > 0) abortTimeout = setTimeout(function () {
            xhr.onreadystatechange = empty
            xhr.abort()
            ajaxError(null, 'timeout', xhr, settings)
        }, settings.timeout)

        // avoid sending empty string (#319)
        xhr.send(settings.data ? settings.data : null)
        return xhr
    }

    $.get = function (url, success) {
        return $.ajax({
            url: url,
            success: success
        })
    }

    $.post = function (url, data, success, dataType) {
        if ($.isFunction(data)) dataType = dataType || success, success = data, data = null
        return $.ajax({
            type: 'POST',
            url: url,
            data: data,
            success: success,
            dataType: dataType
        })
    }

    $.getJSON = function (url, success) {
        return $.ajax({
            url: url,
            success: success,
            dataType: 'json'
        })
    }

    $.fn.load = function (url, success) {
        if (!this.length) return this
        var self = this,
            parts = url.split(/\s/),
            selector
        if (parts.length > 1) url = parts[0], selector = parts[1]
        $.get(url, function (response) {
            self.html(selector ?
                $(document.createElement('div')).html(response.replace(rscript, "")).find(selector).html() : response)
            success && success.call(self)
        })
        return this
    }

    var escape = encodeURIComponent

    function serialize(params, obj, traditional, scope) {
        var array = $.isArray(obj)
        $.each(obj, function (key, value) {
            if (scope) key = traditional ? scope : scope + '[' + (array ? '' : key) + ']'
                // handle data in serializeArray() format
            if (!scope && array) params.add(value.name, value.value)
                // recurse into nested objects
            else if (traditional ? $.isArray(value) : isObject(value))
                serialize(params, value, traditional, key)
            else params.add(key, value)
        })
    }

    $.param = function (obj, traditional) {
        var params = []
        params.add = function (k, v) {
            this.push(escape(k) + '=' + escape(v))
        }
        serialize(params, obj, traditional)
        return params.join('&').replace('%20', '+')
    }
})(Zepto);

//表单序列化
(function ($) {
    $.fn.serializeArray = function () {
        var result = [],
            el
        $(Array.prototype.slice.call(this.get(0).elements)).each(function () {
            el = $(this)
            var type = el.attr('type')
            if (this.nodeName.toLowerCase() != 'fieldset' &&
                !this.disabled && type != 'submit' && type != 'reset' && type != 'button' &&
                ((type != 'radio' && type != 'checkbox') || this.checked))
                result.push({
                    name: el.attr('name'),
                    value: el.val()
                })
        })
        return result
    }

    $.fn.serialize = function () {
        var result = []
        this.serializeArray().forEach(function (elm) {
            result.push(encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value))
        })
        return result.join('&')
    }

    $.fn.submit = function (callback) {
        if (callback) this.bind('submit', callback)
        else if (this.length) {
            var event = $.Event('submit')
            this.eq(0).trigger(event)
            if (!event.defaultPrevented) this.get(0).submit()
        }
        return this
    }
})(Zepto);

//触摸事件
(function ($) {
    var touch = {},
        touchTimeout

    function parentIfText(node) {
        return 'tagName' in node ? node : node.parentNode
    }

    function swipeDirection(x1, x2, y1, y2) {
        var xDelta = Math.abs(x1 - x2),
            yDelta = Math.abs(y1 - y2)
        return xDelta >= yDelta ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
    }

    var longTapDelay = 750,
        longTapTimeout

    function longTap() {
        longTapTimeout = null
        if (touch.last) {
            touch.el.trigger('longTap')
            touch = {}
        }
    }

    function cancelLongTap() {
        if (longTapTimeout) clearTimeout(longTapTimeout)
        longTapTimeout = null
    }

    $(document).ready(function () {
        var now, delta

        $(document.body).bind('touchstart', function (e) {
            now = Date.now()
            delta = now - (touch.last || now)
            touch.el = $(parentIfText(e.touches[0].target))
            touchTimeout && clearTimeout(touchTimeout)
            touch.x1 = e.touches[0].pageX
            touch.y1 = e.touches[0].pageY
            if (delta > 0 && delta <= 250) touch.isDoubleTap = true
            touch.last = now
            longTapTimeout = setTimeout(longTap, longTapDelay)
        }).bind('touchmove', function (e) {
            cancelLongTap()
            touch.x2 = e.touches[0].pageX
            touch.y2 = e.touches[0].pageY
        }).bind('touchend', function (e) {
            cancelLongTap()

            // double tap (tapped twice within 250ms)
            if (touch.isDoubleTap) {
                touch.el.trigger('doubleTap')
                touch = {}

                // swipe
            } else if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
                (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30)) {
                touch.el.trigger('swipe') &&
                    touch.el.trigger('swipe' + (swipeDirection(touch.x1, touch.x2, touch.y1, touch.y2)))
                touch = {}

                // normal tap
            } else if ('last' in touch) {
                touch.el.trigger('tap')

                touchTimeout = setTimeout(function () {
                    touchTimeout = null
                    touch.el.trigger('singleTap')
                    touch = {}
                }, 250)
            }
        }).bind('touchcancel', function () {
            if (touchTimeout) clearTimeout(touchTimeout)
            if (longTapTimeout) clearTimeout(longTapTimeout)
            longTapTimeout = touchTimeout = null
            touch = {}
        })
    })

    ;
    ['swipe', 'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown', 'doubleTap', 'tap', 'singleTap', 'longTap'].forEach(function (m) {
        $.fn[m] = function (callback) {
            return this.bind(m, callback)
        }
    })
})(Zepto)

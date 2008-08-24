var chunker = /((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^[\]]+\]|[^[\]]+)+\]|\\.|[^ >+~,(\[]+)+|[>+~])(\s*,\s*)?/g;

var cache = null;

if ( document.addEventListener && !document.querySelectorAll ) {
	cache = {};
	function invalidate(){ cache = {}; }
	document.addEventListener("DOMAttrModified", invalidate, false);
	document.addEventListener("DOMNodeInserted", invalidate, false);
	document.addEventListener("DOMNodeRemoved", invalidate, false);
}

function Sizzle(selector, context, results) {
	var doCache = !results;
	results = results || [];
	context = context || document;
	
	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	if ( cache && context === document && cache[ selector ] ) {
		results.push.apply( results, cache[ selector ] );
		return results;
	}
	
	var parts = [], m, set, checkSet, check, mode, extra;
	
	// Reset the position of the chunker regexp (start from head)
	chunker.lastIndex = 0;
	
	while ( (m = chunker.exec(selector)) !== null ) {
		parts.push( m[1] );
		
		if ( m[2] ) {
			extra = RegExp.rightContext;
			break;
		}
	}

	var ret = Sizzle.find( parts.pop(), context );
	set = Sizzle.filter( ret.expr, ret.set );

	if ( parts.length > 0 && !checkSet ) {
		checkSet = makeArray(set);
	}

	while ( parts.length ) {
		var cur = parts.pop(), pop = cur;

		if ( !Expr.relative[ cur ] ) {
			cur = "";
		} else {
			pop = parts.pop();
		}

		if ( pop == null ) {
			pop = context;
		}

		var later = "", match;

		// Position selectors must be done after the filter
		if ( typeof pop === "string" ) {
			while ( (match = Expr.match.POS.exec( pop )) ) {
				later += match[0];
				pop = pop.replace( Expr.match.POS, "" );
			}
		}

		Expr.relative[ cur ]( checkSet, pop );

		if ( later ) {
			Sizzle.filter( later, checkSet, true );
		}
	}
	
	if ( !checkSet ) {
		checkSet = set;
	}

	if ( !checkSet ) {
		throw "Syntax error, unrecognized expression: " + (cur || selector);
	}
	
	for ( var i = 0, l = checkSet.length; i < l; i++ ) {
		if ( checkSet[i] ) {
			results.push( set[i] );
		}
	}

	if ( extra ) {
		arguments.callee( extra, context, results );
	}
	
	return cache && doCache ?
		(cache[ selector ] = results) :
		results;
}

Sizzle.find = function(expr, context){
	var set, match;

	if ( !expr ) {
		return [];
	}

	var later = "", match;

	// Pseudo-selectors could contain other selectors (like :not)
	while ( (match = Expr.match.PSEUDO.exec( expr )) ) {
		if ( RegExp.leftContext.substr(-1) !== "\\" ) {
			later += match[0];
			expr = expr.replace( Expr.match.PSEUDO, "" );
		} else {
			// TODO: Need a better solution, fails: .class\:foo:realfoo(#id)
			break;
		}
	}

	for ( var i = 0, l = Expr.order.length; i < l; i++ ) {
		var type = Expr.order[i];
		if ( (match = Expr.match[ type ].exec( expr )) && RegExp.leftContext.substr(-1) !== "\\" ) {
			match[1] = (match[1] || "").replace(/\\/g, "");
			set = Expr.find[ type ]( match, context );
			if ( set != null ) {
				expr = expr.replace( Expr.match[ type ], "" );
				break;
			}
		}
	}

	if ( !set ) {
		set = context.getElementsByTagName("*");
	}

	expr += later;

	return {set: set, expr: expr};
};

Sizzle.filter = function(expr, set, inplace){
	var old = expr, result = [], curLoop = set, match;

	while ( expr && set.length ) {
		for ( var type in Expr.filter ) {
			if ( (match = Expr.match[ type ].exec( expr )) != null ) {
				var anyFound = false, filter = Expr.filter[ type ], goodArray = null;

				if ( curLoop == result ) {
					result = [];
				}

				if ( Expr.preFilter[ type ] ) {
					match = Expr.preFilter[ type ]( match, curLoop );

					if ( match[0] === true ) {
						goodArray = [];
						var last = null;
						for ( var i = 0, l = curLoop.length; i < l; i++ ) {
							var elem = curLoop[i];
							if ( elem && last !== elem ) {
								goodArray.push( elem );
								last = elem;
							}
						}
					}

				}

				var goodPos = 0;

				for ( var i = 0, l = curLoop.length; i < l; i++ ) {
					var item = curLoop[i];
					if ( item ) {
						if ( goodArray && item != goodArray[goodPos] ) {
							goodPos++;
						}

						var found = filter( item, match, goodPos, goodArray );
						if ( inplace && found != null ) {
							curLoop[i] = found ? curLoop[i] : false;
						} else if ( found ) {
							result.push( item );
							anyFound = true;
						}
					}
				}

				if ( found !== undefined ) {
					if ( !inplace ) {
						curLoop = result;
					}

					expr = expr.replace( Expr.match[ type ], "" );

					if ( !anyFound ) {
						return [];
					}

					break;
				}
			}
		}


		expr = expr.replace(/\s*,\s*/, "");

		// Improper expression
		if ( expr == old ) {
			throw "Syntax error, unrecognized expression: " + expr;
		}

		old = expr;
	}

	return curLoop;
};

var Expr = {
	order: [ "ID", "NAME", "TAG" ],
	match: {
		ID: /#((?:[\w\u0128-\uFFFF_-]|\\.)+)/,
		CLASS: /\.((?:[\w\u0128-\uFFFF_-]|\\.)+)/,
		NAME: /\[name=((?:[\w\u0128-\uFFFF_-]|\\.)+)\]/,
		ATTR: /\[((?:[\w\u0128-\uFFFF_-]|\\.)+)\s*(?:(\S*=)\s*(['"]*)([^\3]+)\3|)\]/,
		TAG: /^((?:[\w\u0128-\uFFFF\*_-]|\\.)+)/,
		CHILD: /:(only|nth|last|first)-child\(?(even|odd|[\dn+-]*)\)?/,
		POS: /:(nth|eq|gt|lt|first|last|even|odd)\(?(\d*)\)?/,
		PSEUDO: /:((?:[\w\u0128-\uFFFF_-]|\\.)+)(?:\((['"]*)((?:\([^\)]+\)|[^\2\(\)]*)+)\2\))?/
	},
	attrMap: {
		"class": "className"
	},
	relative: {
		"+": function(checkSet, part){
			for ( var i = 0, l = checkSet.length; i < l; i++ ) {
				var elem = checkSet[i];
				if ( elem ) {
					checkSet[i] = dir( elem, "previousSibling" );
				}
			}

			Sizzle.filter( part, checkSet, true );
		},
		">": function(checkSet, part){
			for ( var i = 0, l = checkSet.length; i < l; i++ ) {
				var elem = checkSet[i];
				if ( elem ) {
					checkSet[i] = elem.parentNode;
					if ( typeof part !== "string" ) {
						checkSet[i] = checkSet[i] == part;
					}
				}
			}

			if ( typeof part === "string" ) {
				Sizzle.filter( part, checkSet, true );
			}
		},
		"": function(checkSet, part){
			var doneName = "done" + (done++), checkFn = dirCheck;

			if ( !part.match(/\W/) ) {
				var nodeCheck = part = part.toUpperCase();
				checkFn = dirNodeCheck;
			}

			for ( var i = 0, l = checkSet.length; i < l; i++ ) {
				if ( checkSet[i] ) {
					checkSet[i] = checkFn(checkSet[i], "parentNode", part, doneName, i, checkSet, nodeCheck);
				}
			}
		},
		"~": function(checkSet, part){
			var doneName = "done" + (done++), checkFn = dirCheck;

			if ( !part.match(/\W/) ) {
				var nodeCheck = part = part.toUpperCase();
				checkFn = dirNodeCheck;
			}

			for ( var i = 0, l = checkSet.length; i < l; i++ ) {
				if ( checkSet[i] ) {
					checkSet[i] = checkFn(checkSet[i], "previousSibling", part, doneName, i, checkSet, nodeCheck);
				}
			}
		}
	},
	find: {
		ID: function(match, context){
			if ( context.getElementById ) {
				var m = context.getElementById(match[1]);
				return m ? [m] : [];
			}
		},
		NAME: function(match, context){
			return context.getElementsByName(match[1]);
		},
		TAG: function(match, context){
			return context.getElementsByTagName(match[1]);
		}
	},
	preFilter: {
		CLASS: function(match){
			return " " + match[1] + " ";
		},
		ID: function(match){
			return match[1];
		},
		TAG: function(match){
			return match[1].toUpperCase();
		},
		CHILD: function(match){
			if ( match[1] == "nth" ) {
				// parse equations like 'even', 'odd', '5', '2n', '3n+2', '4n-1', '-n+6'
				var test = /(-?)(\d*)n((?:\+|-)?\d*)/.exec(
					match[2] == "even" && "2n" || match[2] == "odd" && "2n+1" ||
					!/\D/.test( match[2] ) && "0n+" + match[2] || match[2]);

				// calculate the numbers (first)n+(last) including if they are negative
				match[2] = (test[1] + (test[2] || 1)) - 0;
				match[3] = test[3] - 0;
			}

			// TODO: Move to normal caching system
			match[0] = typeof get_length == "undefined" ? "done" + (done++) : "nodeCache";

			return match;
		},
		ATTR: function(match){
			var name = match[1];
			
			if ( Expr.attrMap[name] ) {
				match[1] = Expr.attrMap[name];
			}

			return match;
		},
		PSEUDO: function(match){
			if ( match[1] === "not" ) {
				match[3] = match[3].split(/\s*,\s*/);
			}
			
			return match;
		},
		POS: function(match){
			match.unshift( true );
			return match;
		}
	},
	filters: {
		enabled: function(elem){
			return !elem.disabled && elem.type !== "hidden";
		},
		disabled: function(elem){
			return elem.disabled;
		},
		checked: function(elem){
			return elem.checked;
		},
		selected: function(elem){
			elem.parentNode.selectedIndex;
			return elem.selected;
		}
	},
	setFilters: {
		first: function(elem, i){
			return i === 0;
		},
		last: function(elem, i, match, array){
			return i === r.length - 1;
		},
		even: function(elem, i){
			return i % 2 === 0;
		},
		odd: function(elem, i){
			return i % 2 === 1;
		}
	},
	filter: {
		CHILD: function(elem, match){
			var type = match[1], parent = elem.parentNode;

			var doneName = match[0];
			
			if ( !parent[ doneName ] ) {
				var count = 1;

				for ( var node = parent.firstChild; node; node = node.nextSibling ) {
					if ( node.nodeType == 1 ) {
						node.nodeIndex = count++;
					}
				}

				parent[ doneName ] = count - 1;
			}

			if ( type == "first" ) {
				return elem.nodeIndex == 1;
			} else if ( type == "last" ) {
				return elem.nodeIndex == parent[ doneName ];
			} else if ( type == "only" ) {
				return parent[ doneName ] == 1;
			} else if ( type == "nth" ) {
				var add = false, first = match[2], last = match[3];

				if ( first == 1 && last == 0 ) {
					return true;
				}

				if ( first == 0 ) {
					if ( elem.nodeIndex == last ) {
						add = true;
					}
				} else if ( (elem.nodeIndex - last) % first == 0 && (elem.nodeIndex - last) / first >= 0 ) {
					add = true;
				}

				return add;
			}
		},
		PSEUDO: function(elem, match, i, array){
			var name = match[1], filter = Expr.filters[ name ];

			if ( name === "contains" ) {
				return (elem.textContent || elem.innerText || "").indexOf(match[3]) >= 0;
			} else if ( name === "not" ) {
				var not = match[3];

				for ( var i = 0, l = not.length; i < l; i++ ) {
					if ( Sizzle.filter(not[i], [elem]).length > 0 ) {
						return false;
					}
				}

				return true;
			} else if ( filter ) {
				return filter( elem, i, match, array )
			}
		},
		ID: function(elem, match){
			return elem.nodeType === 1 && elem.getAttribute("id") === match;
		},
		TAG: function(elem, match){
			return (match === "*" && elem.nodeType === 1) || elem.nodeName === match;
		},
		CLASS: function(elem, match){
			return (" " + elem.className + " ").indexOf( match ) > -1;
		},
		ATTR: function(elem, match){
			var value = elem[ match[1] ] + "", type = match[2], check = match[4];
			return value == null ?
				false :
				type === "=" || type === "|=" ?
				value === check :
				type === "*=" || type === "~=" ?
				value.indexOf(check) >= 0 :
				!match[4] ?
				elem.hasAttribute( match[1] ) || elem[ match[1] ] :
				type === "!=" ?
				value != check :
				type === "^=" ?
				value.indexOf(check) === 0 :
				type === "$=" ?
				value.substr(value.length - check.length) === check :
				false;
		},
		POS: function(elem, match, i, array){
			var name = match[2], filter = Expr.setFilters[ name ];

			if ( filter ) {
				return filter( elem, i, match, array );
			}
		}
	}
};

if ( document.querySelectorAll ) (function(){
	var oldSizzle = Sizzle;
	
	Sizzle = function(query, context, extra){
		if ( context === document ) {
			try {
				return context.querySelectorAll(query);
			} catch(e){}
		}
		
		return oldSizzle(query, context, extra);
	};

	Sizzle.find = oldSizzle.find;
	Sizzle.filter = oldSizzle.filter;
})();

if ( document.getElementsByClassName ) {
	Expr.order.splice(1, 0, "CLASS");
	Expr.find.CLASS = function(match, context) {
		return context.getElementsByClassName(match[1]);
	};
}

var done = 0;

function makeArray(a) {
	return Array.prototype.slice.call( a );
}

// TODO: Need a proper check here
if ( document.all && !window.opera ) {
	function makeArray(a) {
		if ( a instanceof Array ) {
			return Array.prototype.slice.call( a );
		}

		var ret = [];
		for ( var i = 0; a[i]; i++ ) {
			ret.push( a[i] );
		}

		return ret;
	}
}

function dir( elem, dir ) {
	var cur = elem[ dir ];
	while ( cur && cur.nodeType !== 1 ) {
		cur = cur[ dir ];
	}
	return cur || false;
}

function dirNodeCheck( elem, dir, cur, doneName, i, checkSet, nodeCheck ) {
	elem = elem[dir]
	var match = false;

	while ( elem ) {
		if ( elem[doneName] ) {
			match = checkSet[ elem[doneName] ];
			break;
		}

		elem[doneName] = i;

		if ( elem.nodeName === cur ) {
			match = elem;
			break;
		}

		elem = elem[dir];
	}

	return match;
}

function dirCheck( elem, dir, cur, doneName, i, checkSet, nodeCheck ) {
	elem = elem[dir]
	var match = false;

	while ( elem ) {
		if ( elem[doneName] ) {
			match = checkSet[ elem[doneName] ];
			break;
		}

		elem[doneName] = i;

		if ( elem.nodeType === 1 && Sizzle.filter( cur, [elem] ).length > 0 ) {
			match = elem;
			break;
		}

		elem = elem[dir];
	}
	
	return match;
}

if ( typeof jQuery === "function") (function(){
	jQuery.find = Sizzle;

	var filters = jQuery.expr[":"];
	for ( var name in filters ) {
		if ( !Expr.filters[name] ) {
			Expr.filters[name] = filters[name];
		}
	}

	var set = ['lt','gt','nth','eq','first','last','even','odd'];
	for ( var i = 0; i < set.length; i++ ) {
		Expr.setFilters[ set[i] ] = Expr.filters[ set[i] ];
		delete Expr.filters[ set[i] ];
	}
})();

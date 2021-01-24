var CbLiveSearchInstances = [];

function hideAllCbLiveSearch(except) {
    for (var i = 0; i < CbLiveSearchInstances.length; i++) {
        var cbLiveSearch = CbLiveSearchInstances[i];
        if (except === cbLiveSearch) continue;
        if (cbLiveSearch.showingList) {
            cbLiveSearch.list.selectManualSelection();
            cbLiveSearch.hideList();
        }
    }
}

document.addEventListener('click', function () {
    hideAllCbLiveSearch();
});

function createCbLiveSearchSkeleton() {
    var input = document.createElement('input');
    input.type = 'text';
    input.classList.add('cb-livesearch');
    return input
}

function createCbLiveSearchListSkeleton(cbLiveSearch) {
    var list = document.createElement('div');
    list.className = 'cb-livesearch-list';
    list.setPosition = function (element) {
        list.style.left = element.offsetLeft + "px";
        list.style.top = (element.offsetTop + element.offsetHeight) + "px";
        list.style.width = element.offsetWidth + "px";
    };

    var table = document.createElement('table');
    table.className = 'cb-livesearch-list-table';
    list.appendChild(table);
    var tbody = table.createTBody();
    list.tbody = tbody;

    var messageBox = document.createElement('div');
    messageBox.className = 'cb-livesearch-message-box';
    list.appendChild(messageBox);
    list.messageBox = messageBox;

    list.addItem = function (html, id) {
        var rowIndex = list.tbody.rows.length;
        var row = list.tbody.insertRow(rowIndex);
        var cell = row.insertCell(0);
        row.detail = {'html': html, 'id': id, 'rowIndex': rowIndex};
        cell.innerHTML = stripScripts(html);
        row.addEventListener('click', function (e) {
            list.itemSelected(html, id, rowIndex);
        });
    };
    list.itemSelected = function (html, id, rowIndex) {
        var detail = {'html': html, 'id': id, 'rowIndex': rowIndex};
        var event = new CustomEvent('itemselected', {'detail': detail});
        list.manualSelection = rowIndex;
        list.changeManualSelection();
        list.dispatchEvent(event);
        cbLiveSearch.hideList();
    };
    list.manualSelection = -1;
    list.manualSelectPrior = function () {
        list.manualSelection--;
        if (list.manualSelection < 0) {
            list.manualSelection = list.tbody.rows.length - 1;
            list.changeManualSelection();
        } else {
            list.changeManualSelection();
        }
    };
    list.manualSelectNext = function () {
        list.manualSelection++;
        if (list.manualSelection >= list.tbody.rows.length) {
            list.manualSelection = 0 < list.tbody.rows.length ? 0 : -1;
            list.changeManualSelection();
        } else {
            list.changeManualSelection();
        }
    };
    list.scrollToRow = function (row) {
        var currentScroll = row.offsetTop;
        var startScrollWindow = list.scrollTop;
        var endScrollWindow = list.scrollTop + list.offsetHeight;

        if (currentScroll < startScrollWindow) {
            list.scrollTop = currentScroll;
        } else if (currentScroll + row.offsetHeight > endScrollWindow) {
            list.scrollTop = currentScroll - (list.offsetHeight - row.offsetHeight);
        }
    };
    list.changeManualSelection = function () {
        var currentSelection = tbody.getElementsByClassName('selection');
        for (var i = 0; i < currentSelection.length; i++) {
            var e = currentSelection[i];
            e.classList.remove('selection');
        }
        if (list.manualSelection != -1) {
            var row = list.tbody.rows[list.manualSelection];
            row.classList.add('selection');

            list.scrollToRow(row);
        }
    };
    list.clearManualSelection = function () {
        list.manualSelection = -1;
        list.changeManualSelection();
    };
    list.getSelectedItem = function () {
        if (list.manualSelection == -1) {
            return null;
        } else {
            return list.tbody.rows[list.manualSelection].detail;
        }
    };
    list.selectManualSelection = function () {
        var selection = null;
        if (list.manualSelection != -1) {
            selection = list.tbody.rows[list.manualSelection].detail
        }
        cbLiveSearch.setValue(selection);
    };
    list.selectValue = function (value) {
        if (list.manualSelection != -1 && value != null) {
            var detail = list.tbody.rows[list.manualSelection].detail;
            if (detail.id == value.id) {
                var row = list.tbody.rows[list.manualSelection];
                list.scrollToRow(row);
                return;
            } // a exibição está ok, não é necessário varrer
        }
        if (value != null) {
            for (var i = 0; i < list.tbody.rows.length; i++) {
                list.manualSelection = -1;
                var detail = list.tbody.rows[i].detail;
                if (detail.id == value.id) {
                    list.manualSelection = i;
                    break;
                }
            }
            if (list.manualSelection == -1) {
                list.addItem(value.html, value.id);
                list.manualSelection = list.tbody.rows.length - 1;
            }

            list.changeManualSelection();
        } else {
            list.clearManualSelection();
        }
    };
    list.clear = function () {
        for (var i = list.tbody.rows.length - 1; i >= 0; i--) {
            list.tbody.deleteRow(i);
        }
        list.clearManualSelection();
    };
    return list;
}

function CbLiveSearch(input, fillItems) {
    var self = this;
    CbLiveSearchInstances.push(this);
    this.html2text = function (html) {
        if (html == null) return html;
        var div = document.createElement('div');
        div.innerHTML = stripScripts(html);
        return div.innerText;
    };

    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    this.fillItems = fillItems === true;
    this.input = input || createCbLiveSearchSkeleton();
    this.input.setAttribute('autocomplete', 'off');
    this.input.setAttribute('autocorrect', 'off');
    this.input.setAttribute('autocapitalize', 'off');
    this.input.setAttribute('spellcheck', 'false');
    this.input.setAttribute('aria-autocomplete', 'list');
    this.input.setAttribute('aria-haspopup', 'true');
    this.input.classList.add('cb-livesearch-input');
    this.inputClickListener = this.input.addEventListener('click', function (e) {
        hideAllCbLiveSearch(self);
        e.preventDefault();
        e.stopPropagation();
    });
    this.selectOnFocus = true;
    this.inputFocusListener = this.input.addEventListener('focus', function () {
        self.showList();
        if (self.selectOnFocus) {
            self.input.setSelectionRange(0, self.input.value.length)
        }
    });
    this.list = createCbLiveSearchListSkeleton(this);
    this.list.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
    });

    this.list.id = guid();
    this.input.setAttribute('aria-controls', this.list.id);

    this.inputKeyDownListener = this.input.addEventListener('keydown', function (e) {
        self.showList();
        switch (e.keyCode) {
            case 38: // up arrow
                self.list.manualSelectPrior();
                break;
            case 40: // down arrow
                self.list.manualSelectNext();
                break;
            case 13: // enter
                var selected = self.list.getSelectedItem();
                if (selected != null) {
                    self.list.itemSelected(selected.html, selected.id, selected.rowIndex);
                }
                break;
            case 9: // tab
                self.list.selectManualSelection();
                self.hideList();
                break;
            case 86:
                if (e.ctrlKey || e.metaKey) {
                    self.search();
                }
                break;
        }
    });

    this.inputChangeListener = this.input.addEventListener('change', function (e) {
        self.search();
    });

    this.searchDelay = 100;
    this.chainCallback = [];
    this.chainBusy = false;
    this.chainProcess = function () {
        if (self.chainBusy) return;
        self.chainBusy = true;
        try {
            while (self.chainCallback.length !== 0) {
                var data = self.chainCallback.shift();
                if (data.requestId == self.requestId) {
                    self.list.clear();
                    for (var i = 0; i < data.records.length; i++) {
                        self.list.addItem(data.records[i].html, data.records[i].id);
                    }
                }
            }
            self.showOrHideEmptyText();
        } finally {
            self.chainBusy = false;
        }
    }
    this.search = function (emptySearch) {
        if (emptySearch === undefined) emptySearch = false;
        if (self.timerCallback != null) {
            clearTimeout(self.timerCallback);
        }
        var text = self.getText();
        self.timerCallback = setTimeout(function () {
            if (self.sourceCallback != undefined) {
                self.lastSearch = text;
                self.requestId++;
                self.timerCallback = null;

                var getTextOld;
                if (emptySearch) {
                    getTextOld = self.getText;
                    self.getText = function () {
                        return '';
                    }
                }
                try {
                    self.sourceCallback(function (data) {
                        self.chainCallback.push(data);
                        self.chainProcess();
                    }, self);
                } finally {
                    if (emptySearch) {
                        self.getText = getTextOld;
                    }
                }
            }
        }, self.searchDelay);
    };
    this.inputKeyUpListener = this.input.addEventListener('keyup', function (e) {
        if (e.keyCode == 32 // space
            || e.keyCode == 46 // delete
            || e.keyCode >= 48 && e.keyCode <= 90 // numbers and characters
            || e.keyCode >= 96 && e.keyCode <= 111 // numpad and math operators
            || e.keyCode >= 186 && e.keyCode <= 222 // other valid keys and accents
            || e.keyCode == 8 // backspace
            || e.keyCode == 229 // android
            || e.shiftKey && e.keyCode == 45
        ) {
            self.search();
        }
    });
    this.requestId = 0;
    this.showList = function () {
        if (!self.showingList) {
            var parent = self.input.parentElement || document.body;
            self.showingList = true;
            parent.style.position = 'relative';
            parent.appendChild(self.list);
            self.list.setPosition(self.input);
            self.list.style.display = 'inline-block';
            self.list.selectValue(self.getValue());
            if (self.list.tbody.rows.length == 0) {
                self.search();
            }
            setTimeout(function () {
                self.list.classList.add('show');
                //TODO: scroll if is necessary
            }, 60);
            // setTimeout(function () {
            //     if (document.activeElement === self.input) self.input.select();
            // }, 120);
        }
    };
    this.hideList = function () {
        if (self.showingList) {
            self.showingList = false;
            self.list.classList.remove('show');
            setTimeout(function () {
                var parent = self.list.parentElement;
                if (parent != null) parent.removeChild(self.list);
            }, 50);
        }
    };
    this.list.addEventListener('itemselected', function (e) {
        self.setValue(e.detail);
    });
    this.setValue = function (value, fireEvents) {
        if (value === self.selectedValue ||
            value != null && self.selectedValue != null && value.id == self.selectedValue.id) {
            if (self.selectedValue != null) {
                self.input.value = self.html2text(self.selectedValue.html);
            } else {
                self.input.value = '';
            }
            return;
        }
        if (value != null) {
            if (value.html == undefined || value.id == undefined) {
                throw new Error('Value must have fields "html" and "id".');
            }
            self.selectedValue = value;
            self.input.value = self.html2text(value.html);
            self.hideList();
        } else {
            self.selectedValue = null;
            self.input.value = null;
        }
        self.list.selectValue(value);

        if (fireEvents || fireEvents === undefined) {
            var detail = null;
            if (value != null) {
                detail = {'html': value.html, 'id': value.id, 'rowIndex': value.rowIndex};
            }
            self.input.dispatchEvent(new CustomEvent('valuechange', {'detail': detail}));
        }
    };
    this.getValue = function () {
        if (this.selectedValue == null) {
            return null;
        }
        return {id: this.selectedValue.id, html: this.selectedValue.html};
    };
    this.getText = function () {
        return self.input.value;
    };
    this.setSourceCallback = function (sourceCallback) {
        self.sourceCallback = sourceCallback;
        if (self.fillItems) {
            self.search(true);
        }
    };
    this.setEmptyText = function (text) {
        self.emptyText = text;
    };
    this.showOrHideEmptyText = function () {
        if (self.list.tbody.rows.length === 0) {
            self.list.messageBox.innerText = self.emptyText || '';
            self.list.messageBox.classList.add('show');
        } else {
            self.list.messageBox.classList.remove('show');
            var text = self.getText();
            if (self.list.tbody.rows.length !== 0 && text.trim().length !== 0 && self.list.manualSelection === -1) {
                self.list.manualSelectNext();
            }
        }
    };
    this.clear = function () {
        self.list.clear();
        self.setValue(null);
    };
    this.destroy = function () {
        input.classList.remove('cb-livesearch');
        input.removeEventListener('click', self.inputClickListener);
        input.removeEventListener('focus', self.inputFocusListener);
        input.removeEventListener('keydown', self.inputKeyDownListener);
        input.removeEventListener('keyup', self.inputKeyUpListener);
        input.removeEventListener('change', self.inputChangeListener);
        CbLiveSearchInstances.remove(self);
    }
}

// based on: http://web.archive.org/web/20120918093154/http://lehelk.com/2011/05/06/script-to-remove-diacritics/
var defaultDiacriticsRemovalMap = [
    {'base':'A', 'letters':/[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]/g},
    {'base':'AA','letters':/[\uA732]/g},
    {'base':'AE','letters':/[\u00C6\u01FC\u01E2]/g},
    {'base':'AO','letters':/[\uA734]/g},
    {'base':'AU','letters':/[\uA736]/g},
    {'base':'AV','letters':/[\uA738\uA73A]/g},
    {'base':'AY','letters':/[\uA73C]/g},
    {'base':'B', 'letters':/[\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181]/g},
    {'base':'C', 'letters':/[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]/g},
    {'base':'D', 'letters':/[\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779]/g},
    {'base':'DZ','letters':/[\u01F1\u01C4]/g},
    {'base':'Dz','letters':/[\u01F2\u01C5]/g},
    {'base':'E', 'letters':/[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]/g},
    {'base':'F', 'letters':/[\u0046\u24BB\uFF26\u1E1E\u0191\uA77B]/g},
    {'base':'G', 'letters':/[\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E]/g},
    {'base':'H', 'letters':/[\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D]/g},
    {'base':'I', 'letters':/[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]/g},
    {'base':'J', 'letters':/[\u004A\u24BF\uFF2A\u0134\u0248]/g},
    {'base':'K', 'letters':/[\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2]/g},
    {'base':'L', 'letters':/[\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780]/g},
    {'base':'LJ','letters':/[\u01C7]/g},
    {'base':'Lj','letters':/[\u01C8]/g},
    {'base':'M', 'letters':/[\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C]/g},
    {'base':'N', 'letters':/[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]/g},
    {'base':'NJ','letters':/[\u01CA]/g},
    {'base':'Nj','letters':/[\u01CB]/g},
    {'base':'O', 'letters':/[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]/g},
    {'base':'OI','letters':/[\u01A2]/g},
    {'base':'OO','letters':/[\uA74E]/g},
    {'base':'OU','letters':/[\u0222]/g},
    {'base':'P', 'letters':/[\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754]/g},
    {'base':'Q', 'letters':/[\u0051\u24C6\uFF31\uA756\uA758\u024A]/g},
    {'base':'R', 'letters':/[\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782]/g},
    {'base':'S', 'letters':/[\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784]/g},
    {'base':'T', 'letters':/[\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786]/g},
    {'base':'TZ','letters':/[\uA728]/g},
    {'base':'U', 'letters':/[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]/g},
    {'base':'V', 'letters':/[\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245]/g},
    {'base':'VY','letters':/[\uA760]/g},
    {'base':'W', 'letters':/[\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72]/g},
    {'base':'X', 'letters':/[\u0058\u24CD\uFF38\u1E8A\u1E8C]/g},
    {'base':'Y', 'letters':/[\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE]/g},
    {'base':'Z', 'letters':/[\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762]/g},
    {'base':'a', 'letters':/[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/g},
    {'base':'aa','letters':/[\uA733]/g},
    {'base':'ae','letters':/[\u00E6\u01FD\u01E3]/g},
    {'base':'ao','letters':/[\uA735]/g},
    {'base':'au','letters':/[\uA737]/g},
    {'base':'av','letters':/[\uA739\uA73B]/g},
    {'base':'ay','letters':/[\uA73D]/g},
    {'base':'b', 'letters':/[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]/g},
    {'base':'c', 'letters':/[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/g},
    {'base':'d', 'letters':/[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A]/g},
    {'base':'dz','letters':/[\u01F3\u01C6]/g},
    {'base':'e', 'letters':/[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g},
    {'base':'f', 'letters':/[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]/g},
    {'base':'g', 'letters':/[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]/g},
    {'base':'h', 'letters':/[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]/g},
    {'base':'hv','letters':/[\u0195]/g},
    {'base':'i', 'letters':/[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/g},
    {'base':'j', 'letters':/[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]/g},
    {'base':'k', 'letters':/[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]/g},
    {'base':'l', 'letters':/[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]/g},
    {'base':'lj','letters':/[\u01C9]/g},
    {'base':'m', 'letters':/[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]/g},
    {'base':'n', 'letters':/[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/g},
    {'base':'nj','letters':/[\u01CC]/g},
    {'base':'o', 'letters':/[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/g},
    {'base':'oi','letters':/[\u01A3]/g},
    {'base':'ou','letters':/[\u0223]/g},
    {'base':'oo','letters':/[\uA74F]/g},
    {'base':'p','letters':/[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]/g},
    {'base':'q','letters':/[\u0071\u24E0\uFF51\u024B\uA757\uA759]/g},
    {'base':'r','letters':/[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]/g},
    {'base':'s','letters':/[\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]/g},
    {'base':'t','letters':/[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]/g},
    {'base':'tz','letters':/[\uA729]/g},
    {'base':'u','letters':/[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/g},
    {'base':'v','letters':/[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]/g},
    {'base':'vy','letters':/[\uA761]/g},
    {'base':'w','letters':/[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]/g},
    {'base':'x','letters':/[\u0078\u24E7\uFF58\u1E8B\u1E8D]/g},
    {'base':'y','letters':/[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]/g},
    {'base':'z','letters':/[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]/g}
];
function removeDiacritics (str) {
    for(var i=0; i < defaultDiacriticsRemovalMap.length; i++) {
        str = str.replace(defaultDiacriticsRemovalMap[i].letters, defaultDiacriticsRemovalMap[i].base);
    }
    return str;
}

function createOfflineDataSource(records) {
    if (!records instanceof Array) {
        console.error('Not a array: ' + JSON.stringify(records));
        return null;
    }

    return function (itemsCallback, liveSearch) {
        var text = removeDiacritics(liveSearch.getText().trim().toLowerCase());
        var div = document.createElement('div');

        var filteredRecords = [];
        for (var i = 0; i < records.length; i++) {
            var record = records[i];
            if (record.html == null) {
                console.warn('Record has no "html" field.');
                continue;
            }
            if (record.id == null) {
                console.warn('Record has no "id" field.');
                continue;
            }
            div.innerHTML = stripScripts(records[i].html);
            var recordText = removeDiacritics(div.innerText.trim().toLowerCase());
            if (recordText.indexOf(text) != -1) {
                filteredRecords.push(record);
            }
        }
        itemsCallback({
            requestId: liveSearch.requestId,
            records: filteredRecords
        });
    }
}

function stripEventAttributes(e) {
    var elements = e.querySelectorAll("*");
    for (var i = 0; i < elements.length; i++) {
        var e = elements[i];
        var toRemove = [];
        for (var j = 0; j < e.attributes.length; j++) {
            var attrName = e.attributes[j].name;
            if (attrName.toLowerCase().startsWith('on')) {
                toRemove.push(attrName);
            }
        }
        for (var j = 0; j < toRemove.length; j++) {
            e.removeAttribute(toRemove[j]);
        }
    }
}

/**
 * Note that at present, browsers will not execute the script if inserted using the innerHTML property, and likely never
 * will especially as the element is not added to the document
 */
function stripScripts(s) {
    var div = document.createElement('div');
    div.innerHTML = s;
    var scripts = div.getElementsByTagName('script');
    var i = scripts.length;
    while (i--) {
        scripts[i].parentNode.removeChild(scripts[i]);
    }
    stripEventAttributes(div);
    return div.innerHTML;
}

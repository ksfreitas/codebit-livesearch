var CbLiveSearchInstances = [];

function hideAllCbLiveSearch(except) {
    for (var i = 0; i < CbLiveSearchInstances.length; i++) {
        var cbLiveSearch = CbLiveSearchInstances[i];
        if (except === cbLiveSearch) continue;
        cbLiveSearch.hideList();
        cbLiveSearch.list.selectManualSelection();
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
        cell.innerHTML = html;
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
        div.innerHTML = html;
        return div.innerText;
    };
    this.fillItems = fillItems === true;
    this.input = input || createCbLiveSearchSkeleton();
    this.input.setAttribute('autocomplete', 'off');
    this.input.classList.add('cb-livesearch-input');
    this.inputClickListener = this.input.addEventListener('click', function (e) {
        hideAllCbLiveSearch(self);
        e.preventDefault();
        e.stopPropagation();
    });
    this.inputFocusListener = this.input.addEventListener('focus', function () {
        self.showList();
    });
    this.list = createCbLiveSearchListSkeleton(this);
    this.list.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
    });

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
        }
    });
    this.searchDelay = 300;
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
                        if (data.requestId != self.requestId) {
                            return;
                        }
                        self.list.clear();
                        for (var i = 0; i < data.records.length; i++) {
                            self.list.addItem(data.records[i].html, data.records[i].id);
                        }
                        if (data.records.length != 0 && text.trim().length != 0) {
                            self.list.manualSelectNext();
                        }
                        self.showOrHideEmptyText();
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
            }, 60);
            setTimeout(function () {
                // if (document.activeElement === self.input) self.input.select();
            }, 120);
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
        if (self.list.tbody.rows.length == 0) {
            self.list.messageBox.innerText = self.emptyText || '';
            self.list.messageBox.classList.add('show');
        } else {
            self.list.messageBox.classList.remove('show');
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
        CbLiveSearchInstances.remove(self);
    }
}

function createOfflineDataSource(records) {
    if (!records instanceof Array) {
        console.error('Not a array: ' + JSON.stringify(records));
        return null;
    }

    return function (itemsCallback, liveSearch) {
        var text = liveSearch.getText().trim().toLowerCase();
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
            div.innerHTML = records[i].html;
            var recordText = div.innerText.trim().toLowerCase();
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
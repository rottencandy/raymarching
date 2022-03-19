const panel = document.querySelector('#debug details');

export const createSlider = (name: string, min = '1', max = '100', initial = '10') => {
    const control = document.createElement('input');
    control.type = 'range';
    control.id = name;
    control.min = min;
    control.max = max;
    control.value = initial;

    const label = document.createElement('label');
    label.innerText = name;

    const container = document.createElement('div');
    container.appendChild(label);
    container.appendChild(control);

    let currentValue = 0;
    control.oninput = function() { currentValue = Number(this.value); };

    panel.appendChild(container);

    return () => currentValue;
};

export const sliderNoLoop = (name: string, fn: (val: number) => void, min = '1', max = '100', initial = '10') => {
    const control = document.createElement('input');
    control.type = 'range';
    control.id = name;
    control.min = min;
    control.max = max;
    control.value = initial;

    const label = document.createElement('label');
    label.innerText = name;

    const container = document.createElement('div');
    container.appendChild(label);
    container.appendChild(control);

    control.oninput = function() { const val = Number(this.value); fn(val); };

    panel.appendChild(container);
};

export const createDropdown = (name: string, options: string[], fn: (val: string) => void) => {
    const control = document.createElement('select');
    options.forEach((o) => {
        const ele = document.createElement('option');
        ele.value = o;
        ele.textContent = o;
        control.appendChild(ele);
    });
    control.onchange = (e: any) => fn(e.target.value);

    const label = document.createElement('label');
    label.innerText = name;
    const container = document.createElement('div');
    container.appendChild(label);
    container.appendChild(control);

    panel.appendChild(container);
};

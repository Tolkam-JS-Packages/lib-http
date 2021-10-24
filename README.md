# tolkam/lib-http

HTTP request library based on axios.

## Usage

````ts
const http = new Http();

// global error listeners
http.addErrorListener((error, type) => {
    console.log('Error type: %s', type);
    console.log('Error: %O', error);
});

const [promise, cancelFn] = http.request({
    url: 'https://httpbin.org/status/404',
});

promise
    .then(result => console.log(result))
    .catch(reason => console.log('Failure reason: %O', reason));
````

## Documentation

The code is rather self-explanatory and API is intended to be as simple as possible. Please, read the sources/Docblock if you have any questions. See [Usage](#usage) for quick start.

## License

Proprietary / Unlicensed 🤷

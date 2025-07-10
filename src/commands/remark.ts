export function remark(args: string[]): void {
    if (args.length === 0) {
        console.error("Please provide a message. e.g. 'trn remark hello'");
        process.exit(1);
    }

    const message = args.join(' ');
    console.log(message);
} 